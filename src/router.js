const Router = require('express').Router;
const {tokenGenerator, voiceResponse} = require('./handler');
// const pool = require('./dbconnection');
const cors = require('cors');
const router = new Router();
router.options('*', cors());
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Cryptr = require('cryptr');
const {compile} = require('ejs');

const jwtSecret = 'eUFcJUwcb1oq9x9taoi2VzwIYiwKs+54Yzq5woBS+l4=';
const cryptr = new Cryptr(jwtSecret);
const dbconfig = require('./dbconfig');


function createConnection(username, password) {
  const mydbconfig = {
    server: 'dm3sql140.dm3.wizmoworks.net',
    user: username,
    password: password,
    database: 'xSellerateMTBE',
    port: 29892,
    trustServerCertificate: true,
  };

  return new Promise((resolve, reject) => {
    const pool = new sql.ConnectionPool(mydbconfig);

    pool.connect().then(() => {
      console.log('Connected to database');
      resolve(pool);
    }).catch((err) => {
      console.error('Error connecting to the database:', err);
      reject(err);
    });
  });
}
router.post('/db', async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (token) {
      jwt.verify(token, jwtSecret, async (err, decodedToken) => {
        if (err) {
          console.error('Error verifying JWT:', err);
          return res.status(401).json({error: 'Unauthorized'});
        } else {
          const passwd = cryptr.decrypt(decodedToken.password);
          const username = decodedToken.username;
          try {
            const pool = await createConnection(username, passwd);
            const isManager = req.cookies.isManager;

            res.status(200).json({success: 'Connected to database', isManager: isManager});

          } catch (err) {
            if (err.code === 'ELOGIN') {
              return res.status(401).json({error: 'Invalid username or password'});
            }
            console.error('Error during login:', err);

          }

        }

      });
    }else{
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if the username and password are provided

    // Attempt to create a connection with the provided username and password

  } catch (err) {
    console.error('Unexpected error during login:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/dbtest', async (req, res) => {
  try{
    const token = req.cookies.jwt;
    if (token) {
      jwt.verify(token, jwtSecret, async (err, decodedToken) => {
        if (err) {
          console.error('Error verifying JWT:', err);
          return res.status(401).json({error: 'Unauthorized'});
        } else {
          const passwd = cryptr.decrypt(decodedToken.password);
          const username = decodedToken.username;
          try {
            const pool = await createConnection(username, passwd);

            const isManager = req.cookies.isManager;
            console.log('isManager on call-options:', isManager);
            if (isManager == 1 ) {
              return res.status(302).json({error: 'Manager not allowed to access this page'});
            }

            pool.query(`select top 1 *
                 from xSellerateMTBE.dbo.vwLoginDetails where UserId = '${username}'`, function(err, recordset1) {
              if (err) console.log(err);
              const CallerPhone = recordset1.recordset[0].CallerPhone;

              const leadId = req.cookies.LeadId;

              if (leadId) {
                pool.query(`SELECT *
                          FROM xSellerateMTBE.dbo.vwIC_q_MainForCallers
                          WHERE LeadId = '${leadId}' and callerId='${username}'`, function(err, recordset) {
                  if (err) console.log(err);
                  // if no records found with the given leadId
                  if(!recordset.recordset[0]){
                    console.log('No records found with the given leadId');
                    pool.query(`select top 1 * from xSellerateMTBE.dbo.vwIC_q_MainForCallers where callerId='${username}' order by LeadId  asc`, function(err, recordset) {
                      if (err) console.log(err);
                      // add cookie
                      if(recordset.recordset[0]){
                        console.log('recordset: !st leadId:', recordset.recordset[0].LeadId);
                        res.cookie('CallerPhone', CallerPhone, );
                        res.cookie('LeadId', recordset.recordset[0].LeadId);
                        res.status(200).json({callOptions: recordset.recordset});
                        return;


                      }else{
                        res.cookie('CallerPhone', CallerPhone );
                        res.status(404).json({error: 'No records found'});
                        return;
                      }
                      // res.render('call-options', {callOptions: recordset.recordset});
                    });

                  }else {
                    console.log('Reached here');
                    res.cookie('CallerPhone', CallerPhone );
                    res.cookie('LeadId', recordset.recordset[0].LeadId);
                    res.setHeader('Content-Type', 'application/json');
                    res.send({callOptions: recordset.recordset});
                  }
                  // res.render('call-options', {callOptions: recordset.recordset});
                });
              }
              else {
                pool.query(`select top 1 * from xSellerateMTBE.dbo.vwIC_q_MainForCallers where callerId='${username}' order by LeadId  asc`, function(err, recordset) {
                  if (err) console.log(err);
                  // add cookie
                  if(recordset.recordset[0]){
                    res.cookie('CallerPhone', CallerPhone, );
                    res.cookie('LeadId', recordset.recordset[0].LeadId);
                    res.setHeader('Content-Type', 'application/json');
                    res.send({callOptions: recordset.recordset});

                  }else{
                    res.cookie('CallerPhone', CallerPhone, );
                    res.status(404).json({error: 'No records found'});
                  }
                  // res.render('call-options', {callOptions: recordset.recordset});
                });
              }

            });



          } catch (err) {
            if(err.code === 'ELOGIN'){
              return res.status(401).json({error: 'Invalid username or password'});
            }
            console.error('Error during login:', err);

          }

        }

      });
    }else{
      return res.status(401).json({ error: 'Unauthorized' });
    }

  }catch (err) {
    console.error('Unexpected error during login:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/logout', (req, res) => {
  res.clearCookie('jwt');
  res.clearCookie('isManager');
  res.status(200).json({success: 'Logged out successfully'});
});

router.post('/signup', async (req, res) => {
  try{
    const {username, password} = req.body;
   try{
     const pool = await createConnection(dbconfig.user, dbconfig.password);
    pool.query(`INSERT INTO adm.vwUser (UserId, TempPassword, RoleID, TimeZoneNumber)
                VALUES ('${username}', '${password}', 49, 1)`, function(err, recordset) {
      if (err) {
        console.error('Error during signup:', err);
        return res.status(500).json({error: 'Internal server error'});

      }
      res.status(200).json({success: 'Signup successful'});
    });
   }catch (err) {
     if (err.code === 'ELOGIN') {
       return res.status(401).json({error: 'Invalid username or password'});
     }
     console.error('Error during login:', err);
     return res.status(500).json({error: 'Internal server error'});
   }
  }catch (err) {
    console.error('Unexpected error during login:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
// Login Page

router.post('/signin', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if the username and password are provided
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Attempt to create a connection with the provided username and password
    try {
      const pool = await createConnection(username, password);
      let isManager = 0;

      // Use a Promise to handle the asynchronous nature of pool.query
      const isManagerPromise = new Promise((resolve, reject) => {
        pool.query(`SELECT IS_MEMBER ('xSellerateMTBECallerManagers') AS isManager`, function (err, recordset) {
          if (err) {
            console.error('Error during login:', err);
            reject(err);
          } else {
            console.log('isManager:', recordset.recordset[0].isManager);
            isManager = recordset.recordset[0].isManager;
            console.log('isManager:', isManager);
            resolve(isManager);
          }
        });
      });

      // Wait for the Promise to resolve before continuing
      const resolvedIsManager = await isManagerPromise;

      const encryptedPassword = cryptr.encrypt(password);
      jwt.sign({ username: username, password: encryptedPassword }, jwtSecret, { expiresIn: '1h' }, (err, token) => {
        if (err) {
          console.error('Error generating JWT:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        if(isManager){
          res.cookie('isManager', resolvedIsManager, { httpOnly: true });
          res.cookie('jwt', token, { httpOnly: true });
          return res.status(302).json({ success: 'Login successful' });

        }else{
          res.cookie('isManager', resolvedIsManager, { httpOnly: true });
          res.cookie('jwt', token, { httpOnly: true });
          return res.status(200).json({ success: 'Login successful' });
        }
      });

      // Check if the connection was successful (no errors)
    } catch (err) {
      if (err.code === 'ELOGIN') {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      console.error('Error during login:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } catch (err) {
    console.error('Unexpected error during login:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


router.get('/logincheck', (req, res) => {

});
router.get('/token', (req, res) => {
  res.send(tokenGenerator());
});

router.post('/voice', (req, res) => {
  res.set('Content-Type', 'text/xml');
  const CallerPhone = req.body.CallerPhone;
  console.log('CallerPhone:', CallerPhone);
  res.send(voiceResponse(req.body));
});

router.get('/', (req, res) => {
  const username = req.cookies.username;
  const request = pool.request();
  request.query(`select *
                 from xSellerateMTBE.dbo.Login
                 where UserId = '${username}'`,
    function(err, recordset1) {
    if (err) console.log(err);
    // eslint-disable-next-line max-len
    request.input('CallerId', sql.VarChar, username);
    request.input('TeamGrpId', sql.Int, null);
    request.input('EndDate', sql.Date, '2023-12-31');
    request.input('StartDate', sql.Date, '2023-01-01');
    request.input('DialerId', sql.VarChar, null);
    request.input('SuperSdrId', sql.VarChar, null);
    // eslint-disable-next-line max-len
    request.execute('xSellerateMTBE.dbo.uspSetValuesForPeriod', function(err, recordset2) {
      if (err) console.log(err);
      const Dials = recordset2.recordset[0].Dials;
      const Reached = recordset2.recordset[0].Resched;

      let connectionRate = 0;
      if (Dials > 0) {
        connectionRate = Math.floor((Reached / Dials) * 100);
      }
      const firstAppt = recordset2.recordset[0].FirstAppt;
      let conversionRate = 0;
      if (Reached > 0) {
        conversionRate = Math.floor((firstAppt / Reached) * 100);
      }


      const combinedResult = {
        query1: recordset1.recordset,
        query2: recordset2.recordset,
        connectionRate: connectionRate,
        conversionRate: conversionRate,
      };
      // res.send(combinedResult);
      res.render('index-2', combinedResult);
    });
  });
});
router.post('/mdashboarddata', (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (token) {
      jwt.verify(token, jwtSecret, async (err, decodedToken) => {
        if (err) {
          console.error('Error verifying JWT:', err);
          return res.status(401).json({error: 'Unauthorized'});
        } else {
          const passwd = cryptr.decrypt(decodedToken.password);
          const username = decodedToken.username;
          try {
            const pool = await createConnection(username, passwd);
            const isManager = req.cookies.isManager;
            if(isManager == 0){
              return res.status(302).json({error: 'Not a manager'});
            }

            const request = pool.request();


            //main query

            request.query(`EXEC uspCallerManagerCallerList;`,
              function(err, recordset1) {
                if (err) console.log(err);
                // eslint-disable-next-line max-len

                request.input('EndDate', sql.Date, req.body.endDate);
                request.input('StartDate', sql.Date, req.body.startDate);
                request.input('ReportType', sql.VarChar, req.body.reportType);
                // eslint-disable-next-line max-len
                request.execute('xSellerateMTBE.dbo.uspWebDashboardMetricsForManagers', function(err, recordset2) {
                  if (err) console.log(err);

                  if(!recordset2){
                    let emptyArray = [];
                    const combinedResult = {
                      query1: recordset1.recordset,
                      query2: emptyArray
                    };
                    res.status(200).json({dashboardData: combinedResult});



                    // return res.status(200).json({error: 'No records found'});
                  }else{



                    const combinedResult = {
                      query1: recordset1.recordset,
                      query2: recordset2.recordset
                    };
                    // res.send(combinedResult);
                    res.status(200).json({dashboardData: combinedResult});
                  }
                });
              });


            //main query end

          } catch (err) {
            if (err.code === 'ELOGIN') {
              return res.status(401).json({error: 'Invalid username or password'});
            }
            console.error('Error during login:', err);

          }

        }

      });
    }else{
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if the username and password are provided

    // Attempt to create a connection with the provided username and password

  } catch (err) {
    console.error('Unexpected error during login:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

});

// caller stats
router.post('/callerstats', (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (token) {
      jwt.verify(token, jwtSecret, async (err, decodedToken) => {
        if (err) {
          console.error('Error verifying JWT:', err);
          return res.status(401).json({error: 'Unauthorized'});
        } else {
          const passwd = cryptr.decrypt(decodedToken.password);
          const username = decodedToken.username;
          try {
            const pool = await createConnection(username, passwd);
            const isManager = req.cookies.isManager;
            if(isManager == 0){
              return res.status(302).json({error: 'Not a manager'});
            }

            const request = pool.request();


            //main query

            request.query(`select top 1 *
                 from xSellerateMTBE.dbo.vwLoginDetails where UserId = '${req.body.callername}'`,
              function(err, recordset1) {
                if (err) console.log(err);
                // eslint-disable-next-line max-len

                request.input('CallerId', sql.NVarChar, req.body.callername);
                request.input('EndDate', sql.Date, req.body.endDate);
                request.input('StartDate', sql.Date, req.body.startDate);
                request.input('ReportType', sql.VarChar, req.body.reportType);
                // eslint-disable-next-line max-len
                request.execute('xSellerateMTBE.dbo.uspWebDashboardMetrics', function(err, recordset2) {
                  if (err) console.log(err);

                  if(!recordset2){
                    let emptyArray = [];
                    const combinedResult = {
                      query1: recordset1.recordset,
                      query2: emptyArray
                    };
                    res.status(200).json({dashboardData: combinedResult});



                    // return res.status(200).json({error: 'No records found'});
                  }else{



                    const combinedResult = {
                      query1: recordset1.recordset,
                      query2: recordset2.recordset
                    };
                    // res.send(combinedResult);
                    res.status(200).json({dashboardData: combinedResult});
                  }
                });
              });


            //main query end

          } catch (err) {
            if (err.code === 'ELOGIN') {
              return res.status(401).json({error: 'Invalid username or password'});
            }
            console.error('Error during login:', err);

          }

        }

      });
    }else{
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if the username and password are provided

    // Attempt to create a connection with the provided username and password

  } catch (err) {
    console.error('Unexpected error during login:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

});


router.post('/tabs-data', (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (token) {
      jwt.verify(token, jwtSecret, async (err, decodedToken) => {
        if (err) {
          console.error('Error verifying JWT:', err);
          return res.status(401).json({error: 'Unauthorized'});
        } else {
          const passwd = cryptr.decrypt(decodedToken.password);
          const username = decodedToken.username;
          try {
            const pool = await createConnection(username, passwd);

            const request = pool.request();


            //main query

            request.input('EndDate', sql.Date, req.body.endDate);
            request.input('StartDate', sql.Date, req.body.startDate);
            request.input('ReportType', sql.VarChar, req.body.reportType);
            request.input('CallerId', sql.VarChar, username);
            // eslint-disable-next-line max-len
            request.execute('xSellerateMTBE.dbo.uspWebDashboardMetrics', function(err, recordset2) {
              if (err) console.log(err);

              if(!recordset2){
                return res.status(404).json({error: 'No records found'});
              }



              const combinedResult = {
                query2: recordset2.recordset
              };
              // res.send(combinedResult);
              res.status(200).json({dashboardData: combinedResult});
            });


            //main query end

          } catch (err) {
            if (err.code === 'ELOGIN') {
              return res.status(401).json({error: 'Invalid username or password'});
            }
            console.error('Error during login:', err);

          }

        }

      });
    }else{
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if the username and password are provided

    // Attempt to create a connection with the provided username and password

  } catch (err) {
    console.error('Unexpected error during login:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

});

router.post('/dialoutcomes', (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (token) {
      jwt.verify(token, jwtSecret, async (err, decodedToken) => {
        if (err) {
          console.error('Error verifying JWT:', err);
          return res.status(401).json({error: 'Unauthorized'});
        } else {
          const passwd = cryptr.decrypt(decodedToken.password);
          const username = decodedToken.username;
          try {
            const pool = await createConnection(username, passwd);


            const request = pool.request();

            const leadId = req.cookies.LeadId;
            const choices = ["FirstAppt", "Callback", "EmailSent","NewContact","HangUp","NotInterested", "NoAns","Discarded"]
            const choice = req.body.dialOutcome;
            const detail = req.body.detail;
            let finalChoice = ''
            if(choices.includes(choice)){
              finalChoice = choice;
            }
            console.log('choice:', choice);
            console.log('finalChoice:', finalChoice);
            console.log('detail:', detail);
            // else{
            //   res.status(400).json({error: 'Invalid dialOutcome'});
            // }


            //main query

           if(leadId){
             request.query(`select top 1 *
                 from xSellerateMTBE.dbo.IC_t_IC_Leads where CallerId = '${username}' and LeadId='${leadId}'`,
               function(err, recordset1) {
                 if (err) console.log(err);
                 // eslint-disable-next-line max-len
                 request.input('ID', sql.Int, recordset1.recordset[0].ID);
                 request.input('DialOutCome', sql.NVarChar, finalChoice);
                 request.input('OutComeDetail', sql.NVarChar, req.body.reportType);
                 // eslint-disable-next-line max-len
                 request.execute('xSellerateMTBE.dbo.uspCallDisposition ', function(err, recordset2) {
                   if (err) console.log(err);

                   if(!recordset2){
                     let emptyArray = [];
                     const combinedResult = {
                       query1: recordset1.recordset,
                       query2: emptyArray
                     };
                     res.status(200).json({dashboardData: combinedResult});



                     // return res.status(200).json({error: 'No records found'});
                   }else{



                     const combinedResult = {
                       query1: recordset1.recordset,
                       query2: recordset2.recordset
                     };
                     // res.send(combinedResult);
                     res.status(200).json({dashboardData: combinedResult});
                   }
                 });
               });

           }else{
             return res.status(400).json({error: 'LeadId not found in cookies'});
           }


            //main query end

          } catch (err) {
            if (err.code === 'ELOGIN') {
              return res.status(401).json({error: 'Invalid username or password'});
            }
            console.error('Error during login:', err);

          }

        }

      });
    }else{
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if the username and password are provided

    // Attempt to create a connection with the provided username and password

  } catch (err) {
    console.error('Unexpected error during login:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

});
router.post('/cdashboard', (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (token) {
      jwt.verify(token, jwtSecret, async (err, decodedToken) => {
        if (err) {
          console.error('Error verifying JWT:', err);
          return res.status(401).json({error: 'Unauthorized'});
        } else {
          const passwd = cryptr.decrypt(decodedToken.password);
          const username = decodedToken.username;
          try {
            const pool = await createConnection(username, passwd);

            const request = pool.request();


          //main query

            request.query(`select top 1 *
                 from xSellerateMTBE.dbo.vwLoginDetails where UserId = '${username}'`,
              function(err, recordset1) {
                if (err) console.log(err);
                // eslint-disable-next-line max-len
                request.input('EndDate', sql.Date, req.body.endDate);
                request.input('StartDate', sql.Date, req.body.startDate);
                request.input('ReportType', sql.VarChar, req.body.reportType);
                request.input('CallerId', sql.VarChar, username);
                // eslint-disable-next-line max-len
                request.execute('xSellerateMTBE.dbo.uspWebDashboardMetrics', function(err, recordset2) {
                  if (err) console.log(err);

                  // console.log('recordset2 at cdashboard:', recordset2);

                  if(!recordset2.recordset){
                    let emptyArray = [];
                    const combinedResult = {
                      query1: recordset1.recordset,
                      query2: emptyArray
                    };
                    res.status(200).json({dashboardData: combinedResult, query2:"Null by me"});



                    // return res.status(200).json({error: 'No records found'});
                  }else{



                  const combinedResult = {
                    query1: recordset1.recordset,
                    query2: recordset2.recordset,
                  };
                  // res.send(combinedResult);
                  res.status(200).json({dashboardData: combinedResult, query2:"Not null and not by me"});
                  }
                });
              });


            //main query end

          } catch (err) {
            if (err.code === 'ELOGIN') {
              return res.status(401).json({error: 'Invalid username or password'});
            }
            console.error('Error during login:', err);

          }

        }

      });
    }else{
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if the username and password are provided

    // Attempt to create a connection with the provided username and password

  } catch (err) {
    console.error('Unexpected error during login:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

});

router.get('/index-2', (req, res) => {
  res.render('index-2');
});
router.get('/add-referral', (req, res) => {
  res.render('add-referral');
});
router.get('/add-referral-2', (req, res) => {
  res.render('add-referral-2');
});
router.get('/add-referral-3', (req, res) => {
  res.render('add-referral-3');
});
router.get('/add-referral-4', (req, res) => {
  res.render('add-referral-4');
});
router.get('/add-referral-5', (req, res) => {
  res.render('add-referral-5');
});
router.get('/add-referral-6', (req, res) => {
  res.render('add-referral-6');
});
router.get('/call-options', async (req, res) => {
  // eslint-disable-next-line max-len
  try{
    const token = req.cookies.jwt;
    if (token) {
      jwt.verify(token, jwtSecret, async (err, decodedToken) => {
        if (err) {
          console.error('Error verifying JWT:', err);
          return res.status(401).json({error: 'Unauthorized'});
        } else {
          const passwd = cryptr.decrypt(decodedToken.password);
          const username = decodedToken.username;
          try {
            const pool = await createConnection(username, passwd);

            const isManager = req.cookies.isManager;
            console.log('isManager on call-options:', isManager);
            if (isManager == 1 ) {
              return res.status(302).json({error: 'Manager not allowed to access this page'});
            }

            pool.query(`select top 1 *
                 from xSellerateMTBE.dbo.vwLoginDetails where UserId = '${username}'`, function(err, recordset1) {
              if (err) console.log(err);
              const CallerPhone = recordset1.recordset[0].CallerPhone;

              const leadId = req.cookies.LeadId;

              if (leadId) {
                pool.query(`SELECT *
                          FROM xSellerateMTBE.dbo.vwIC_q_MainForCallers
                          WHERE LeadId = '${leadId}' and callerId='${username}'`, function(err, recordset) {
                  if (err) console.log(err);
                  // if no records found with the given leadId
                  if(!recordset.recordset[0]){
                    console.log('No records found with the given leadId');
                    pool.query(`select top 1 * from xSellerateMTBE.dbo.vwIC_q_MainForCallers where callerId='${username}' order by LeadId  asc`, function(err, recordset) {
                      if (err) console.log(err);
                      // add cookie
                      if(recordset.recordset[0]){
                        console.log('recordset: !st leadId:', recordset.recordset[0].LeadId);
                        res.cookie('CallerPhone', CallerPhone, );
                        res.cookie('LeadId', recordset.recordset[0].LeadId);
                        res.status(200).json({callOptions: recordset.recordset});
                        return;


                      }else{
                        res.cookie('CallerPhone', CallerPhone );
                        res.status(404).json({error: 'No records found'});
                        return;
                      }
                      // res.render('call-options', {callOptions: recordset.recordset});
                    });

                  }else {
                    console.log('Reached here');
                    res.cookie('CallerPhone', CallerPhone );
                    res.cookie('LeadId', recordset.recordset[0].LeadId);
                    res.setHeader('Content-Type', 'application/json');
                    res.send({callOptions: recordset.recordset});
                  }
                  // res.render('call-options', {callOptions: recordset.recordset});
                });
              }
              else {
                pool.query(`select top 1 * from xSellerateMTBE.dbo.vwIC_q_MainForCallers where callerId='${username}' order by LeadId  asc`, function(err, recordset) {
                  if (err) console.log(err);
                  // add cookie
                  if(recordset.recordset[0]){
                    res.cookie('CallerPhone', CallerPhone, );
                    res.cookie('LeadId', recordset.recordset[0].LeadId);
                    res.setHeader('Content-Type', 'application/json');
                    res.send({callOptions: recordset.recordset});

                  }else{
                    res.cookie('CallerPhone', CallerPhone, );
                    res.status(404).json({error: 'No records found'});
                  }
                  // res.render('call-options', {callOptions: recordset.recordset});
                });
              }

            });



          } catch (err) {
            if(err.code === 'ELOGIN'){
              return res.status(401).json({error: 'Invalid username or password'});
            }
            console.error('Error during login:', err);

          }

        }

      });
    }else{
      return res.status(401).json({ error: 'Unauthorized' });
    }

  }catch (err) {
    console.error('Unexpected error during login:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  // res.render('call-options');
});

router.get('/find-lead', (req, res) => {
  try{
    const token = req.cookies.jwt;
    if (token) {
      jwt.verify(token, jwtSecret, async (err, decodedToken) => {
        if (err) {
          console.error('Error verifying JWT:', err);
          return res.status(401).json({error: 'Unauthorized'});
        } else {
          const passwd = cryptr.decrypt(decodedToken.password);
          const username = decodedToken.username;
          try {
            const pool = await createConnection(username, passwd);
            const leadId = req.cookies.LeadId;
            console.log('leadId:', leadId);
            if (leadId) {
              // eslint-disable-next-line max-len
              pool.query(`SELECT TOP 1 *
                FROM xSellerateMTBE.dbo.vwIC_q_MainForCallers
                WHERE LeadId > '${leadId}' and callerId='${username}'
                ORDER BY LeadId ASC`, function(err, recordset) {
                if (err) res.status(500).json({error: 'Internal Server Error'});
                // if no records found with the given leadId then get the first record
                if(!recordset.recordset[0]){
                  pool.query(`SELECT TOP 1 *
                FROM xSellerateMTBE.dbo.vwIC_q_MainForCallers
                WHERE callerId='${username}'
                ORDER BY LeadId ASC`, function(err, recordset) {
                    if (err) res.status(500).json({error: 'Internal Server Error'});
                    if(!recordset.recordset[0]){
                      res.status(404).json({error: 'No records found'});

                    }else{
                    res.cookie('LeadId', recordset.recordset[0].LeadId);
                    res.status(200).json({message: 'Success!'});}
                    // res.render('call-options', {callOptions: recordset.recordset});
                  });

                }else {
                  res.cookie('LeadId', recordset.recordset[0].LeadId);
                  res.status(200).json({message: 'Success!'});
                }
                // res.render('call-options', {callOptions: recordset.recordset});
              });
            } else {
              // Handle the case when leadId is not present in the cookies

              res.status(400).json({error: 'LeadId not found in cookies'});
            }

          } catch (err) {
            if(err.code === 'ELOGIN'){
              return res.status(401).json({error: 'Invalid username or password'});
            }
            console.error('Error during login:', err);

          }

        }

      });
    }else{
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }catch (err) {
    console.error('Unexpected error during login:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/call-options-search', (req, res) => {
  try{
const token = req.cookies.jwt;
    if (token) {
      jwt.verify(token, jwtSecret, async (err, decodedToken) => {
        if (err) {
          console.error('Error verifying JWT:', err);
          return res.status(401).json({error: 'Unauthorized'});
        } else {
          const passwd = cryptr.decrypt(decodedToken.password);
          const username = decodedToken.username;
          try {
            const pool = await createConnection(username, passwd);
            // main query
            const {search, queryType} = req.body;
            console.log('search:', search);
            console.log('queryType:', queryType);

            if (!search || !queryType) {

              return res.status(400).json({error: 'Missing required parameters'});
            }

            if (queryType === 'leadId') {
              console.log('leadId executed');

              const sqlQuery = `
        SELECT *
        FROM xSellerateMTBE.dbo.vwIC_q_MainForCallers
        WHERE LeadId = '${search}' and callerId='${username}';
    `;
              pool.query(sqlQuery, (error, results) => {
                if (error) {
                  console.error('Error executing SQL query:', error);
                  return res.status(500).json({error: 'Internal Server Error'});
                }
                // close pool connection
                // pool.close();
                return res.status(200).json({
                  success: true,
                  message: 'Record reteried successfully',
                  data: results.recordset,
                });
              });
            }
            if (queryType === 'contactName') {
              console.log('contactName executed');
              const sqlQuery = `
        SELECT *
        FROM xSellerateMTBE.dbo.vwIC_q_MainForCallers
        WHERE LOWER(ContactName) LIKE LOWER('%${search}%') and callerId='${username}'`;
              pool.query(sqlQuery, (error, results) => {
                if (error) {
                  console.error('Error executing SQL query:', error);
                  return res.status(500).json({error: 'Internal Server Error'});
                }
                // pool.close();
                return res.status(200).json({
                  success: true,
                  message: 'Record reteried successfully',
                  data: results.recordset,
                });
              });
            }
            if (queryType === 'phoneNumber') {
              console.log('phoneNumber executed');
              const sqlQuery = `
        SELECT *
        FROM xSellerateMTBE.dbo.vwIC_q_MainForCallers
        WHERE CAST(DirectPhone AS VARCHAR) LIKE '%${search}%'
           OR CAST(CompanyPhone AS VARCHAR) LIKE '%${search}%'
           OR CAST(CellPhone AS VARCHAR) LIKE '%${search}%' and callerId='${username}'`;

              pool.query(sqlQuery, (error, results) => {
                if (error) {
                  console.error('Error executing SQL query:', error);
                  return res.status(500).json({error: 'Internal Server Error'});
                }
                // pool.close();
                return res.status(200).json({
                  success: true,
                  message: 'Record reteried successfully',
                  data: results.recordset,
                });
              });
            }

            // end main query
          } catch (err) {
            if(err.code === 'ELOGIN'){
              return res.status(401).json({error: 'Invalid username or password'});
            }
            console.error('Error during login:', err);

          }

        }

      });
    }else{
      return res.status(401).json({ error: 'Unauthorized' });
    }

  }catch (err) {
    console.error('Unexpected error during login:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
// Adding roter to save notes
router.post('/call-contact-update', (req, res) => {
  try{
    const token = req.cookies.jwt;
    if (token) {
      jwt.verify(token, jwtSecret, async (err, decodedToken) => {
        if (err) {
          console.error('Error verifying JWT:', err);
          return res.status(401).json({error: 'Unauthorized'});
        } else {
          const passwd = cryptr.decrypt(decodedToken.password);
          const username = decodedToken.username;
          try {
            const pool = await createConnection(username, passwd);
          //   main query start
            const {
              'contactId': modalContactId,
              'company': modalCompanyName,
              'contact': modalContactName,
              'title': modalTitle,
              'industry': modalIndustry,
              'time': modalTimezone,
              'address': modalAddress,
              'city': modalCity,
              'state': modalState,
              'email': modalEmail,
              'linkedin': modalLinkedin,
              'website': modalWebsite,
            } = req.body;

            console.log('modalContactId:', modalContactId);
            console.log('modalCompanyName:', modalCompanyName);
            console.log('modalContactName:', modalContactName);
            console.log('modalTitle:', modalTitle);
            console.log('modalIndustry:', modalIndustry);
            console.log('modalTimezone:', modalTimezone);
            console.log('modalAddress:', modalAddress);
            console.log('modalCity:', modalCity);
            console.log('modalState:', modalState);
            console.log('modalEmail:', modalEmail);
            console.log('modalLinkedin:', modalLinkedin);


            const transaction = new sql.Transaction(pool);

            transaction.begin((beginErr) => {
              if (beginErr) {
                console.log(beginErr);
                return res.status(500).send('Internal Server Error');
              }

              const contactUpdateQuery = `
        UPDATE xSellerateMTBE.dbo.Contacts
        SET ContactName  = @ContactName,
            Title        = @Title,
            TimeZoneName = @TimeZoneName,
            Address_1    = @Address_1,
            City         = @City,
            State        = @State,
            LinkedInProfile = @LinkedInProfile,
            Email           = @Email
        WHERE ContactId = @ContactId;
    `;

              const companyUpdateQuery = `
        UPDATE xSellerateMTBE.dbo.Companies
        SET CompanyName = @CompanyName,
            Industry    = @Industry,
            Website     = @Website
        WHERE CompanyID = (SELECT TOP 1 CompanyIdInContact
                           FROM xSellerateMTBE.dbo.Contacts
                           WHERE ContactId = @ContactId);
    `;

              const request = new sql.Request(transaction);
              request.input('ContactName', sql.NVarChar, modalContactName);
              request.input('Title', sql.NVarChar, modalTitle);
              request.input('TimeZoneName', sql.NVarChar, modalTimezone);
              request.input('Address_1', sql.NVarChar, modalAddress);
              request.input('City', sql.NVarChar, modalCity);
              request.input('State', sql.NVarChar, modalState);
              request.input('CompanyName', sql.NVarChar, modalCompanyName);
              request.input('ContactId', sql.Int, modalContactId);
              request.input('Industry', sql.NVarChar, modalIndustry);
              request.input('LinkedInProfile', sql.NVarChar, modalLinkedin);
              request.input('Email', sql.NVarChar, modalEmail);
              request.input('Website', sql.NVarChar, modalWebsite);

              request.query(contactUpdateQuery, (contactErr) => {
                if (contactErr) {
                  return transaction.rollback(() => {
                    console.log(contactErr);
                    res.status(500).send('Contact Update Failed');
                  });
                }

                request.query(companyUpdateQuery, (companyErr) => {
                  if (companyErr) {
                    return transaction.rollback(() => {
                      console.log(companyErr);
                      res.status(500).send('Company Update Failed');
                    });
                  }

                  transaction.commit((commitErr) => {
                    if (commitErr) {
                      return transaction.rollback(() => {
                        console.log(commitErr);
                        res.status(500).send('Transaction Commit Failed');
                      });
                    }

                    res.status(200).send('Record Updated Successfully');
                  });
                });
              });
            });
            // main query end


          } catch (err) {
            if(err.code === 'ELOGIN'){
              return res.status(401).json({error: 'Invalid username or password'});
            }
            console.error('Error during login:', err);

          }

        }

      });
    }else{
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }catch (err) {
    console.error('Unexpected error during login:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
router.post('/call-options-notes', (req, res) => {
  try{
    const token = req.cookies.jwt;
    if (token) {
      jwt.verify(token, jwtSecret, async (err, decodedToken) => {
        if (err) {
          console.error('Error verifying JWT:', err);
          return res.status(401).json({error: 'Unauthorized'});
        } else {
          const passwd = cryptr.decrypt(decodedToken.password);
          const username = decodedToken.username;
          try {
            const pool = await createConnection(username, passwd);
            // main query start
            const {leadId, tenantId, callNotes} = req.body;
            console.log('leadId:', leadId);
            console.log('tenantId:', tenantId);
            console.log('callNotes:', callNotes);

            // Ensure that updatedData contains the fields you want to update
            if (!leadId || !tenantId || !callNotes) {
              return res.status(400).json({error: 'Missing required parameters'});
            }

            const sqlQuery = `
      UPDATE xSellerateMTBE.dbo.LM_t_LeadMasterList
      SET CallerNotes = '${callNotes}'
      WHERE leadId = '${leadId}'
        AND tenantId = '${tenantId}';
  `;

            pool.query(sqlQuery, (error, results) => {
              if (error) {
                console.error('Error executing SQL query:', error);
                return res.status(500).json({error: 'Internal Server Error'});
              }

              // Assuming successful update
              return res.status(200).json({
                success: true,
                message: 'Record updated successfully',
              });
            });
            // main query end
          } catch (err) {
            if(err.code === 'ELOGIN'){
              return res.status(401).json({error: 'Invalid username or password'});
            }
            console.error('Error during login:', err);

          }

        }

      });
    }else{
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }catch (err) {
    console.error('Unexpected error during login:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/call-options-2', (req, res) => {
  res.render('call-options-2');
});
router.get('/discard', (req, res) => {
  res.render('discard');
});
router.get('/hung-up', (req, res) => {
  res.render('hung-up');
});
router.get('/not-interested', (req, res) => {
  res.render('not-interested');
});
router.get('/schedule-callback', (req, res) => {
  res.render('schedule-callback');
});
router.get('/schedule-callback-2', (req, res) => {
  res.render('schedule-callback-2');
});
router.get('/schedule-callback-3', (req, res) => {
  res.render('schedule-callback-3');
});
router.get('/schedule-callback-4', (req, res) => {
  res.render('schedule-callback-4');
});
router.get('/send-email', (req, res) => {
  res.render('send-email');
});
router.get('/send-email-2', (req, res) => {
  res.render('send-email-2');
});
router.get('/send-email-3', (req, res) => {
  res.render('send-email-3');
});
router.get('/add-referral2', (req, res) => {
  res.render('add-referral2');
});
router.get('/add-referral-22', (req, res) => {
  res.render('add-referral-22');
});
router.get('/add-referral-32', (req, res) => {
  res.render('add-referral-32');
});
router.get('/add-referral-42', (req, res) => {
  res.render('add-referral-42');
});
router.get('/add-referral-52', (req, res) => {
  res.render('add-referral-52');
});
router.get('/add-referral-62', (req, res) => {
  res.render('add-referral-62');
});
router.get('/call-options2', (req, res) => {
  res.render('call-options2');
});
router.get('/call-options-22', (req, res) => {
  res.render('call-options-22');
});
router.get('/discard2', (req, res) => {
  res.render('discard2');
});
router.get('/hung-up2', (req, res) => {
  res.render('hung-up2');
});
router.get('/not-interested2', (req, res) => {
  res.render('not-interested2');
});
router.get('/schedule-callback2', (req, res) => {
  res.render('schedule-callback2');
});
router.get('/schedule-callback-22', (req, res) => {
  res.render('schedule-callback-22');
});
router.get('/schedule-callback-32', (req, res) => {
  res.render('schedule-callback-32');
});
router.get('/schedule-callback-42', (req, res) => {
  res.render('schedule-callback-42');
});
router.get('/send-email2', (req, res) => {
  res.render('send-email2');
});
router.get('/send-email-22', (req, res) => {
  res.render('send-email-22');
});
router.get('/send-email-32', (req, res) => {
  res.render('send-email-32');
});

module.exports = router;

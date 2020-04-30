Parse.Cloud.define('hello', function(req, res) {
  return 'Hi';
});

// GMAIL SHOULD BE LESS SECURE
// https://myaccount.google.com/lesssecureapps
sendGMail = async(subject, email, html) => {
  
  console.log('sendmail function triggered');
  const emailConfig = {
    user: '***@gmail.com', // sender address
    name: '** Mobile Company Email Name',
    pass: '** gmail password'
  };

  var nodemailer = require('nodemailer');
  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailConfig.user,
      pass: emailConfig.pass
    }
  });

  const mailOptions = {
    from: emailConfig.name + '<' + emailConfig.user + '>',
    // to: 'paola_i@2successcorpph.com', // email,
    to: 'xyr.kylie@gmail.com', // email,
    subject: subject,
    html: '<hr>Original Receiver: <b>' + email + '</b><hr>' + html
  };

  transporter.sendMail(mailOptions, async (err, info) => {
    if(err) {
       console.log('Error Sending Email', err);
       return false;
    }
    
    console.log('Success send email', info);
    return true;
  });
}

// tweak hook for records coounter
updateCounter = async (countType, increment) => {

  // search for the current value first
  let counter = new Parse.Query('Counter')
  counter.equalTo('name',countType);
  const countResult = await counter.first();
  if (countResult) {

    // existing record
    if (increment) {
      console.log(countType +' count update increment total: ' + (countResult.get('value') + 1) );
      return countResult
        .increment('value')
        .save();
    } else {

      // zero handler
      if (countResult.get('value') <= 0){
        console.log(countType +' count update zero total: 0');
        return countResult
          .set('value', 0)
          .save();
      }

      const newValue = countResult.get('value') - 1;

      console.log(countType +' count update decrement total: ' + newValue );
      return countResult
        .set('value', newValue)
        .save();
    }
  }

  // new record
  if (increment) {

    new Parse.Object('Counter')
      .set('name', countType)
      .set('value', 1)
      .save()
      .then(result => {
        console.log(countType +' count new increment total: 1');
        return;
      })
      .catch(function(error) {
        console.log('Error new count: ' + countType , error);
        return;
      });
  }

  console.error('UnHandled counter error: ' + countType , error);
}

// trigger before save
Parse.Cloud.beforeSave('Invitation', async ( request ) => {
  
  let data = request.object;
  if (!data.get('objectId') && data.isNew()) {

    // search in invitation class
    const query = new Parse.Query('Invitation');
    query.equalTo('email', data.get('email'));
    const results = await query.first();

    if (results) {
      throw 'Email already in use.';
    }

    // search in user class
    const user = new Parse.Query('User');
    user.equalTo('email', data.get('email'));
    const users = await user.first();

    if (users) {
      throw 'Email already activated.';
    }
  }
});

// trigger after save
Parse.Cloud.afterSave('Invitation', (request) => {

	let email = request.object.get('email');
  let status = request.object.get('status');
  
  const query = new Parse.Query('Invitation');
  query.equalTo('email', email);
  query.find().then(function(res) {

  	let invite = res[0];

    // do not send again the invitation - welcome
    if ( status > 0) {
      return;
    }

    // send email invitation code
  	console.log('Send Email invitation', invite.id, email);

    // update counter
    updateCounter('Invitation', true);

    let code = invite.id;
    let subject = code + ' is you Invitation Code';
    let html = '<p>The company sent you an invitation that you can use as authentication ' + 
      'to sign-up on 2Success Mobile Application</p><h1 style="color:#f33">' + code +
      '</h1>Regards,<br>2Success HR';

    sendGMail(subject, email, html);

  })
  .catch(function(error) {
    console.log('Error afterSave: ' + error.code + ' : ' + error.message);
    throw error.message;
  });
});

Parse.Cloud.afterDelete('Invitation', (request) => {
  // update counter
  updateCounter('Invitation', false);
});

Parse.Cloud.afterDelete(Parse.User, (request) => {
  // update counter
  updateCounter('User', false);
});

Parse.Cloud.beforeSave(Parse.User, (request) => {

  const user = request.object;

  // check the objectId since its auto by server
  if (!user.get('objectId') && user.isNew()) {

    // update counter
    updateCounter('User', true);
    if (user.get('invitationCode')) {
      // update counter
      updateCounter('Activate', true);

      // delete invitation
      var Invitations = Parse.Object.extend('Invitation');
      var Invitation = new Parse.Query(Invitations);
      Invitation.equalTo('objectId', user.get('invitationCode'));
      Invitation.find({useMasterKey: true}).then(function(result) {
        if ( result.length > 0 ) {
          return result[0].destroy({ useMasterKey: true,
            success: function(result){},
            error: function(error){
              console.error('Invitation Error: ' + error.message);
            }
          });
        }
      });
    } // closing has invitationCode

    let subject = 'Welcome to 2Success Mobile App';
    let html = '<p>Welcome aboard <b>' + user.get('username') + '</b>,</p>' + 
      '<p>Your accountin 2Success Mobile Application successfully created. </p>' +
      '<p>Regards,<br>2Success HR</p>';

    let sendResult = sendGMail(subject, user.get('email'), html);

    if (!sendResult) {
      console.log('Sending welcome-email failed.');
    } else {
      console.log('Send Email Welcome', user.get('email'));
    }
  }
});

Parse.Cloud.beforeSave('RoleAccess', async (request) => {
  const access = request.object;

  if (!access.get('objectId') && access.isNew() && !access.get('roleId')) {
    // search in invitation class
    const query = new Parse.Query('RoleAccess');
    query.equalTo('name', access.get('name'));
    const results = await query.first();

    if (results) {
      throw 'Rolename already used.';
    }

    // search same access
    const queryA = new Parse.Query('RoleAccess');
    queryA.equalTo('access', access.get('access'));
    const resultsA = await queryA.first();

    if (resultsA) {
      const accessName = resultsA.get('name');
      const accessNameRes = accessName.charAt(0).toUpperCase() + accessName.slice(1);
      throw 'Same access found used by ' + accessNameRes;
    }

  }
});

Parse.Cloud.define('UpdateRoleAccess', async (request, response) => {

  const rolename = request.params.name;
  const roleId = request.params.roleId;
  const access = request.params.access;
  const status = request.params.status;

  // search in invitation class
  const query = new Parse.Query('RoleAccess');
  query.equalTo('name', rolename);
  const results = await query.first();

  if (results) {
    console.log(roleId, results.id);

    if (results.id != roleId) {
      throw 'Update - Rolename already used.';
    }
  }
  
  // search same access
  const queryA = new Parse.Query('RoleAccess');
  queryA.equalTo('access', access);
  // query.notEqualTo('objectId', access.get('roleId'));
  const resultsA = await queryA.first();

  if (resultsA) {

    console.log(roleId, resultsA.id);

    // check if same objectId
    if (resultsA.id != roleId) {
      const accessName = resultsA.get('name');
      const accessNameRes = accessName.charAt(0).toUpperCase() + accessName.slice(1);
      throw 'Update - Same access found used by ' + accessNameRes;
    }
  }

  // save the request
  const queryB = new Parse.Query('RoleAccess');
  queryB.equalTo('objectId', roleId);
  const resultsB = await queryB.first();

  if (resultsB) {
    console.log(roleId, resultsB.id);

    resultsB.set('name', rolename);
    resultsB.set('access', access);
    resultsB.set('status', status);
    let successSave = resultsB.save( null, {}).then( async (user) => {
      console.log('Update - Rolename success');
    });
    return successSave;
  }
});

// Resend Invitation
Parse.Cloud.define('ResendInvitation', async (request, response) => {

  const invitationId = request.params.invitationId;
  const email = request.params.email;
  const resend = request.params.resend;

  console.log()

  const query = new Parse.Query('Invitation');
  query.equalTo('objectId', invitationId);
  query.equalTo('email', email);
  const results = await query.first();

  if (results) {
    results.set('status', 1);
    results.set('resend', resend);
    return results.save( null, {useMasterKey:true})
      .then((resp) => {
        console.log('Re-send Email invitation', invitationId, email);

        let subject = 'Resend your Invitation Code: ' + invitationId ;
        let html = '<p>The company re-sent your invitation that you can use as authentication ' + 
          'to sign-up on 2Success Mobile Application</p><h1 style="color:#f33">' + invitationId +
          '</h1>Regards,<br>2Success HR';

        sendGMail(subject, email, html);
        return resp;
      }, err => {
        console.log(err);
        throw err;
      });
  }

  throw 'Request not match in any records.';
});

// forgot password process request
Parse.Cloud.define('ForgotPassword', async (request, response) => {

  const username = request.params.username;
  const email = request.params.email;

  const query = new Parse.Query('User');
  query.equalTo('username', username);
  query.equalTo('email', email);
  const results = await query.first();

  if (results) {
    let newPassword = Math.random().toString(36).substring(7);
    console.log("newPassword", newPassword);

    results.set('password', newPassword);
    results.save( null, {useMasterKey:true});
    let subject = username + ' request for new Password'
    let html = '<p>Your new password is </p><h1 style="color:#f33">' + newPassword +
      '</h1>Regards,<br>2Success HR';

    let sendResult = await sendGMail(subject, email, html);

    // due to pending to send on gmail - dont handle the sending email response
    // if (!sendResult) {
      console.log('Sending new-password failed - to queue');
      // throw 'Sending new password to your email failed.';
    // }
    return results;
  }

  throw 'Request not match in any records.';
});

// Change Password
Parse.Cloud.define('ChangePassword', async (request, response) => {

  const username = request.params.username;
  const email = request.params.email;
  const newPassword = request.params.newpassword;

  const query = new Parse.Query('User');
  query.equalTo('username', username);
  const results = await query.first();

  if (results) {
    results.set('password', newPassword);
    let successSave = results.save( null, {useMasterKey:true}).then( async (user) => {
    let subject = 'Password changed for ' + username
    let html = '<p>This email notifiy that you have successfully change your password.</p>' +
      '</h1>Regards,<br>2Success HR';

    let sendResult = await sendGMail(subject, email, html);
    // due to pending to send on gmail - dont handle the sending email response
    // if (!sendResult) {
      console.log('Sending change-password failed - to queue.');
      // throw 'Sending new password to your email failed.';
    // }
    });
    return successSave;
  }
});

Parse.Cloud.define('SearchKeyword', async (request, response) => {

  const search = request.params;

  let invites = users = [];

  // search in invitations
  if (search.invitation == true) {
    const Invitation = Parse.Object.extend('Invitation');
    const query = new Parse.Query(Invitation);
    query.contains(search.field,  search.keyword.toLowerCase() );
    // query.skip(10);
    query.limit(100);
    invites =  await query.find().then(results => {
      console.log('invite search done');
      return results;
    })
    .catch(error => {
      console.log('error search search');
      return [];
    });
  }

  // search in user
  if (search.user == true) {
    const User = Parse.Object.extend('User');
    const queryA = new Parse.Query(User);
    queryA.contains(search.field,  search.keyword.toLowerCase() );
    // queryA.skip(10);
    queryA.limit(100);
    users =  await queryA.find().then(results => {
      console.log('invite search done');
      return results;
    })
    .catch(error => {
      console.log('error search search');
      return [];
    });
  }

  return invites.concat(users);


  throw 'Request not match in any records.';
});


Parse.Cloud.define('BackgroundSync', async (req, response) => {
  const request = req.params;


  const dateStart = Date.parse(request.start); // DateTime::createWithFormat("Y-m-d H:i:s", request.start);
  let dateEnd = request.end; // DateTime::createWithFormat("Y-m-d H:i:s", request.end);

  if (!dateEnd) {
    dateEnd = Date.now();
  }

  const ObjectClasses = [
    'User',
    'Counter',
    'Invitation',
    'RoleAccess',
  ];

  // search if we had a object Class of request
  if (ObjectClasses.indexOf(request.action) === -1 ) {
    throw 'Background Sync Request not match in any records.';
  }

  const objectClass = Parse.Object.extend(request.action);
  const query = new Parse.Query(objectClass);
  query.greaterThanOrEqualTo('updatedAt', dateStart);
  // query.lessThanOrEqualTo('updatedAt', dateEnd);
  query.descending('updatedAt');
  query.limit(1000);
  dataSync =  await query.find().then(results => {
    console.log('background sync done: ' + request.action);
    return results;
  })
  .catch(error => {
    console.log('error background sync: ' + request.action);
    return error;
  });

  // return result
  return dataSync;

});


// installation
Parse.Cloud.define('InstallApplication', async (req, response) => {
  const request = req.params;

  if (request.action == 'createUser') {
    
    const User = Parse.Object.extend("User");
    const user = new User();
    user.set('username', request.username);
    user.set('password', request.password);
    user.set('email', request.email);
    user.set('fullname', 'Administrator');
    user.set('position', 'Mobile App Administrator');
    user.set('role', '10');
    user.set('status', 1);
    let successUser = await user.save()
    .then( (user) => {
      return 'success';
    }).catch ( (error) => {
      return error.message;
    });

    console.log('result -------------------', successUser);

    if (successUser != 'success') {
      throw successUser; // 'Installation - Error Create Account Request.' ;
    }

    
    throw 'Installation - Create Account Request.' ;
  }
  else {
    throw 'Installation - Action Request: '+ + request.action;;
  }


  throw 'Installation done.';

});



// Parse.Cloud.define('sendPush', function(request, response) {

//     var userQuery = new Parse.Query(Parse.User);
//     userQuery.equalTo('username', request.params.targetUsername);

//     var pushQuery = new Parse.Query(Parse.Installation);
//     pushQuery.matchesQuery('user', userQuery);

//    Parse.Push.send({
//    where: pushQuery,
//      data: {
//         alert: 'You have a new message from push'
//       }, 
//       push_time: request.params.date
//     }, {
//       success: function() {
//         // Push was successful
//         response.success('push successful')
//       },
//       error: function(error) {
//         // Handle error
//         response.error('push failed')
//       }
//    });
// });


// Parse.Cloud.define('login', async (req, res) => {
//     if (!req.params.email || !req.params.password) res.error('email/password is required');
//     const userQuery = new Parse.Query(Parse.User);
//     const roleQuery = new Parse.Query(Parse.Role);
//     try {
//         const user = await Parse.User.logIn(req.params.email, req.params.password);
//         const userRoleQuery = user.relation(Parse.Role).query();

//         const role = await userRoleQuery.find();

//         res.success(role);
//     } catch (error) {
//         res.error(error);
//     }
// });


Parse.Cloud.define('getRole', async (request) => {
  const query = await new Parse.Query(Parse.Role).equalTo('role', request.role).find()
  return query
})


Parse.Cloud.beforeSave("myObjectClass", function(request, response) {
    var myObject = request.object;
     
    if (myObject.isNew()){  // only check new records, else its a update
        var query = new Parse.Query("myObjectClass");
        query.equalTo("myKey",myObject.get("myKey"));
        query.count({
            success:function(number){ //record found, don't save
                //sResult = number;
                if (number > 0 ){
                    response.error("Record already exists");
                } else {
                    response.success();
                }
            },
            error:function(error){ // no record found -> save
                response.success();
            }
        })
    } else {
        response.success();
    }
});

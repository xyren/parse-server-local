
const express = require('express');
require('dotenv').config();

const { default: ParseServer, ParseGraphQLServer } = require('parse-server');
var ParseDashboard = require('parse-dashboard');
var path = require('path');

// Create express app
const app = express();

const serverUrl = process.env.SERVER_URL + ':' + process.env.SERVER_PORT; 

// Create a Parse Server Instance
const parseServer = new ParseServer({
  databaseURI:  process.env.MONGODB_URI + process.env.APP_NAME,
  cloud: __dirname + '/cloud/main.js',
  appId: process.env.APP_ID,
  masterKey: process.env.MASTER_KEY,
  serverURL: serverUrl + '/parse',
  publicServerURL: serverUrl + '/parse',
  liveQuery: {
    classNames: ["Posts", "Comments"] // List of classes to support for query subscriptions
  },
  accountLockout: {
    duration: 1, // minutes lock
    threshold: 3, // attempt
  },
  // passwordPolicy: {
  //   doNotAllowUsername: true, // disable username as password
  // },
  // push: {
  //   android: {
  //     senderId: 'LocalSenderId',
  //     apiKey: process.env.MASTER_KEY,
  //   },
  //   ios: {
  //     pfx: 'path to pfx local',
  //     bundleId: '',
  //     production: false
  //   }
  // },
});

// Create the GraphQL Server Instance
const parseGraphQLServer = new ParseGraphQLServer(
  parseServer,
  {
    graphQLPath: '/graphql',
    playgroundPath: '/playground'
  }
);

var allowInsecureHTTP = true;
var parseDashboardSettings = {
  "apps": [{
    "serverURL": serverUrl + '/parse',
    "appId": process.env.APP_ID,
    //"restAPIKey": process.env.RESTAPI_KEY || "***",
    "masterKey": process.env.MASTER_KEY,
    "appName": process.env.APP_NAME
  }],
  "users": [{
    "user": process.env.DASHBOARD_USER,
    "pass": process.env.DASHBOARD_PW,
    "masterKey": process.env.MASTER_KEY,
    "apps": [{
      "appId": process.env.APP_ID
    }]
  }]
};

var dashboard = new ParseDashboard(parseDashboardSettings, allowInsecureHTTP);
// make the Parse Dashboard available at /dashboard
app.use('/dashboard', dashboard);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function(req, res) {
  res.status(200).send('I dream of being a website.  Please start the parse-server repo on GitHub!');
});

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app.get('/test', function(req, res) {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});

// (Optional) Mounts the REST API
app.use('/parse', parseServer.app);
// Mounts the GraphQL API using graphQLPath: '/graphql'
parseGraphQLServer.applyGraphQL(app);
// (Optional) Mounts the GraphQL Playground - do NOT use in Production
parseGraphQLServer.applyPlayground(app);

// Start the server
var port = process.env.SERVER_PORT;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
  console.log('parse-server-local running on port ' + port + '.');
  console.log('REST API running on ' + serverUrl +'/parse');
  console.log('GraphQL API running on ' + serverUrl +'/graphql');
  console.log('GraphQL Playground running on ' + serverUrl +'/playground');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);

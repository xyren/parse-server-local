# parse-server-local

Main purpose on this project is to help on ionic-back4app parse-server based app coding. Or any parse-server based requirements applications.


### Original codes from
`
https://github.com/parse-community/parse-server-example
`
Example project using the [parse-server](https://github.com/ParsePlatform/parse-server) module on Express.


### Dependencies

* NodeJs `atleast version 4.3`
* MongoDB

### Other dependecies
* express
* kerberos
* parse
* parse-dashboard
* parse-server
* dotenv

### Configuration
* make a copy of .default.env and change into .env

### For Local Development
* Clone this repo and change directory to it.
* `npm install`
* Install mongo locally using [http://docs.mongodb.org/master/tutorial/install-mongodb-on-os-x/](http://docs.mongodb.org/master/tutorial/install-mongodb-on-os-x/)

* If MongoDB is not service - Run `mongo` to connect to your database, just to make sure it's working. Once you see a mongo prompt, exit with Control-D `(Do not user Ctrl-C)`
* Run the server with: `npm start`
* By default it will use a path of /parse for the API routes.  To change this, or use older client SDKs, run `export PARSE_MOUNT=/1` before launching the server.
* You now have a database named "dev" that contains your Parse data
* Install ngrok and you can test with devices

A detailed tutorial is available here:
[Running Parse Server on OpenShift Online (Next Gen)](https://blog.openshift.com/parse-server/)

## Using it

Before using it, you can access a test page to verify if the basic setup is working fine [http://localhost:1337/test](http://localhost:1337/test).
Then you can use the REST API, the JavaScript SDK, and any of our open-source SDKs:


-----
As of April 5, 2017, Parse, LLC has transferred this code to the parse-community organization, and will no longer be contributing to or distributing this code.

[license-svg]: https://img.shields.io/badge/license-BSD-lightgrey.svg
[license-link]: LICENSE
[open-collective-link]: https://opencollective.com/parse-server

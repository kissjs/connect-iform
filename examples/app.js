
/**
 * Module dependencies.
 */

var express = require('express')
  , iform = require('../iform')

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

var userForm = iform({
    username: {
      required: true
    , len: [3, 10]
    }
  , email: 'email'
  , password: {
      required: true
    , len: 3
    }
  , avatar : {
      defaultValue : function(req){
        return '/avatar/' + req.body.username +'.png';
      }
    }
  , age : 'int'
  , floatField : 'float'
  , birth: {
      type: Date
    , toDate : function(){
        if (this.str instanceof Date) {
          return;
        }
        var intDate = Date.parse(this.str);
        if (isNaN(intDate)) {
          return this.str = null;
        } 
        this.str = new Date(intDate);
      }
    }
});

// Routes
app.get('/', function(req, res, next){
    res.render('index', {
        title : 'Hello'
    });
});

app.post('/', userForm(), function(req, res, next) {
    if(req.iform.errors) {
      return res.json(req.iform.errors);
    }
    res.json(req.iform.data);
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

node-iform
====

node-iform is a connect middleware help you validate and convert form data.


*NOTE* You need to view [node-validator](https://github.com/chriso/node-validator)
for more information, if you want to use this node-iform.

*NOTE* If you find a bug, or want some feature, send a pull request.

Example
----

### define rules

At first you need define some rules for validation

    var iform = require('iform');

    var userForm = iform({
            username: {
                len : [4, 15]
            },
            password: {
                len : [6, 20]
            },

            email : {
                type : 'email'
            },

            birth : {
                type : Date,
                isAfter: new Date('01/01/1900'),
                isBefore : null // means now
            },

            age : 'int',

            blog : 'url'
    });

As you see, define a form like this : `var form = iform(rules);`

`rules` is like `{fieldName : fieldRules, ...}`

`fieldRules` is like `{ruleName : ruleParameter, ...}`

        // field name | rule name | rule parameters
           username  :{ len       : [4, 15] }

The rule names can find at [node-validator](https://github.com/chriso/node-validator) project page.

All the methods of Validator and Filter of node-validator can be use as a rule name.
The rule parameters is the arguments for that method.

The `len` is defined by [node-validator](https://github.com/chriso/node-validator) like this

    Validator.prototype.len = function(min, max) { ... }

It takes two parameters. so we use a array as the parameters.

The `type` is a special rule ,e.g.

    email : {
        type : 'email'
    }

it is equals to

    email : {
        'isEmail' : []
    }

you can also use `int`, `date` etc, cause the Validator defined `isInt` and `isDate`

all the method of Valiator starts with `is` and take no arguments can be use as a type.

if you only have a type rule you can use `fieldName : type` define it.

You can also use `Date` `Number` instead of `'date'`, `'number'`

### use the middleware

`userForm` you just defined is a function which returns a middleware, use like this

    app.post('/signup', userForm(), function(req, res, next) {
            if(req.iform.errors) {
                return res.json(req.iform.errors);
            }
            db.users.insert(req.iform.data, function(err, data) {
                res.json({success : true, message: 'Sign up successfully});
            });
    });

the middleware will check the `req.body` by your rules, all the validation errors 
go to `req.iform.errors`, and the filtered and converted data go to `req.iform.data`.

Since the data has been cleaned, you can use it immediately.

If there is another page also use the smae rules but only part of fields,
you can reuse it like this.

    app.post('/profile', userForm('birth', 'age', 'blog'), function(req, res, next){
            if(req.iform.errors) {
                return res.json(req.iform.errors);
            }
            db.users.update({username : req.session.user.username}, req.iform.data, function(err, data) {
                res.json({success : true, message: 'Update profile successfully'});
            });
    });

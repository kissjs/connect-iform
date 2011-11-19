/**
 * node-iform
 *
 * 1. define rules
 *
 *  var userForm = require('iform')({
 *      username: {
 *        required : true ,
 *        len: [3, 7]
 *      } ,
 *      password: {
 *        type: password,
 *        required: true,
 *        len : 3
 *      },
 *      email : {
 *        type :'email',
 *        required : true
 *      },
 *      avatar : {
 *        defaultValue : function(req){
 *          return getAvatar(req.body.email);
 *        }
 *      },
 *      age : Number,
 *      birth : Date
 *  });
 *
 * 2. type
 *
 *  all the type is define in node-validator,  Validator.prototype.is*
 *
 *  there are isDate, isEmail, isCreditCard, isUrl, etc
 *
 *  you can use capitalised string or lowercase string. e.g. 'date', 'Email', 'CreditCard', 'url'
 *
 * 3. rules
 *
 *  all the method in validator.Validator.prototype and validator.prototype.Filter could be use as an rule
 *
 *  you can use the method name as rule name, and set the arguments by rule value, if it takes more than 
 *  1 argument, use array. like this password:{len:[3, 15]}, if you only want minLength, use password:{len: 3}
 *
 * 4. extend node-validator
 *
 *  you can extend Validator and Filter by prototype, after this, you must update iform
 *
 *
 * @author Lin Gui
 */
var Validator = require('validator').Validator
  , Filter    = require('validator').Filter
  ;

function iForm(rules){

  /*
   * vars in closure
   */
  var ifields         = {}
    , fieldNames      = []
    ;

  /**
   * @param {Array} fields fields will add to req.iform.data
   * @return {function} middleware
   */
  function middleware(fields){

    if(!fields) fields = fieldNames;

    return function(req, res, next){
      var params = req.body;
      var iform  = req.iform  = {};
      var idata  = iform.data = {};
      var field, field_name;

      function appendError(msg){
          (iform.errors || (iform.errors = {}))[field_name] = msg;
      }

      // inject node-validator errorHandler
      var ivalidator = iValidator(appendError);

      for (var i = 0; i < fields.length; i += 1) {
        field_name = fields[i];
        if(field = ifields[field_name]){
          var value = params[field_name];
          var rules = field.rules;

          if(value === undefined) {
            // form does not contains
            if(rules.required) {
              appendError(field_name + ' is required');
            }
          } else if(value === null || value === '') {
            // user leave it blank
            if(rules.defaultValue){
              var v = rules.defaultValue;
              idata[field_name] = typeof v === 'function' ? v(req) : v;
            }
            else if(rules.required) {
              appendError(field_name + ' is required');
            } else {
              idata[field_name] = empty(rules.type);
            }
          } else {
            // check the value and convert it
            idata[field_name] = field.validate(value, ivalidator);
          }
        }
      };

      next();
    };
  }

  /**
   * form it self is a middleware, check all req.params
   */
  var form = middleware;

  // form.fields.username() <==> form.username()
  form.fields = ifields;

  // init fields
  // this must at the bottom of iForm, cause of form[name]
  for(var name in rules){
    if(rules.hasOwnProperty(name)) {
      var rule = rules[name];
      if(typeof rule !== 'object'){
        rule = {type: rule};
      }
      var field = ifields[name] = iField(rule);
      if(!form[name]) form[name] = field;
      fieldNames.push(name);
    }
  }

  return form;
}

/**
 * field holder the rules
 */
function iField(rules) {
  // alias toHTML
  var field = function(){
    // TODO toHTML
  }

  field.validate = function(value, ivalidator, fail_msg){
    return ivalidator(value, rules, fail_msg);
  }

  field.rules = rules;

  return field;
}

/**
 * generate default empty value if user leave a non-required field blank
 */
function empty(type) {
  if(!type) return '';
  if(typeof type === 'string') {
    switch(type.toLowerCase()) {
    case 'int':
    case 'decimal':
    case 'float':
      return 0;
    case 'date':
      return null;
    default:
      return ''
    }
  } else if(type === Number) {
    return 0;
  } else if(type === Date) {
    return null;
  } else {
    return '';
  }
}

/**
 * wrap the node-validator
 *
 * @param {function(msg)} errorHandler
 * @return {function}
 */
function iValidator (errorHandler) {
  var validator = new Validator()
    , filter = new Filter();

  if(errorHandler) validator.error = errorHandler;

  /**
   * validate value by rules, and convert it
   *
   * @param {string} value
   * @param {object} rules
   * @param {string} fail_msg
   * @return {*} converted value
   */
  return function(value, rules, fail_msg) {
    validator.check(value, fail_msg);
    var type = rules.type;
    var f, v;
    for(var name in rules) {
      // f(v)
      (f = ruleValidator[name]) && f.apply(validator, Array.isArray(v = rules[name]) ? v : [v]);
    }
    if(type && (f=typeValidator[type])) f.apply(validator);

    filter.convert(value);
    for(var name in rules) {
      // f(v)
      (f = ruleFilter[name]) && f.apply(filter, Array.isArray(v = rules[name]) ? v : [v]);
    }
    if(type && (f=typeFilter[type])) f.apply(validator);
    return filter.value();
  }

}

// hash Validator Filter methods to use in iValidator
var typeValidator = {}
  , ruleValidator = {}
  , typeFilter    = {}
  , ruleFilter    = {}
  ;

/**
 * init validator methods hashs
 * you must call `update` if you extend node-validator
 */
iForm.update = function() {

  for(var name in Validator.prototype) {
    if(name.indexOf('is') === 0 && name.length > 2) {
      var type = name.slice(2);
      typeValidator[type] = typeValidator[type.toLowerCase()] = Validator.prototype[name];
    }
    ruleValidator[name] = ruleValidator[name.toLowerCase()] = Validator.prototype[name];
  }

  for(var name in Filter.prototype) {
    ruleFilter[name] = ruleFilter[name.toLowerCase()] = Filter.prototype[name];
  }

}

ruleValidator[Number] = typeValidator[Number] = Validator.prototype.isDecimal;
ruleValidator[Date]   = typeValidator[Date]   = Validator.prototype.isDate;
ruleFilter[Number]    = typeFilter[Number]    = Filter.prototype.toFloat;

iForm.update();

// export iForm
module.exports = iForm;

//var db = require('../db.js');
var http = require('http');
var TYPES = require('tedious').TYPES;
var url = require('url');
var app = require('express')();
var bodyParser = require('body-parser');
//var sql = require('msnodesql');
//var sql = require('mssql');


function createConnection() {

  var config = {
    server  : "jcidb-server-dev.database.windows.net",
    userName: "jciuser",
    password: "Password2016",
    // If you're on Azure, you will need this:
    options: { encrypt: true, database: 'jcidb' }
  };

  var Connection = require('tedious').Connection;
  var connection = new Connection(config);

  return connection;
}


function createRequest(query, connection) {
  var Request = require('tedious').Request;
  var req =
    new Request(query,
      function (err, rowCount) {
        if (err) {
          throw err;
        }
        connection && connection.close();
      });

  return req;
}

function stream (query, connection, output, defaultContent, req) {

  errorHandler = function (ex) { throw ex; };
  var request = query;
  if (typeof query == "string") {
    request = createRequest(query, connection);
  }

  console.log ("test 1");
  var empty = true;
  request.on('row', function (columns) {
    empty = false;
    console.log (columns);
    output.write(columns[0].value);
	//output.send ( JSON.stringify(columns));
  });

  request.on('done', function (rowCount, more, rows) {
    if (empty) {
      //output.write(defaultContent);
    }
    output.end();
  });

  request.on('doneProc', function (rowCount, more, rows) {
    if (empty) {
      //output.write(defaultContent);
    }
    output.end();
  });

  connection.on('connect', function (err) {
    if (err) {
      throw err;
    }
    connection.execSql(request);
  });

}

output_success = function (req, resp)
{
  data = '';

  resp.writeHead(200, { 'Content-Type': 'text/plain' });
  req.setEncoding('utf8');
  req.on('data', function (chunk) {
    data += chunk;
  });

  req.on('end', function () {
    if (data) {
      body.data = text;
    }

    resp.end("Successed");
  });
};

console.log ("node.js server is started 2");
app.get('/', function(req, resp){
  console.log (req);
  if (req.query.id) {
    get_func(req.query.id, resp);
    //output_success(req, resp);
  }
  else
  	stream("select * from todo for json path", createConnection(), resp, '[]');
});

app.post('/', function(req, resp){
  console.log (req.body);
  if (req.body.body) {
    add_func(req.body.body);
    output_success(req, resp);
  }
});

app.put('/', function(req, resp){
  console.log (req);
  if (req.body.body && req.body.id) {
    update_func(req.body.id, req.body.body);
    output_success(req, resp);
  }
});

app.delete('/', function(req, resp){
  console.log (req);
  if (req.body.body) {
    del_func(req.params.id);
    output_success(req, resp);
  }
});

var server = http.createServer(function (req, resp) {
  console.log ("node.js server is started 3");

  var config = {
    server  : "jcidb-server-dev.database.windows.net",
    userName: "jciuser",
    password: "Password2016",
    // If you're on Azure, you will need this:
    options: { encrypt: true, database: 'jcidb' }
  };
  var body = {
      origin: req.socket.remoteAddress,
      httpVersion: req.httpVersion,
      headers: req.headers,
      trailers: req.trailers,
      method: req.method,
      url: req.url
    },
    data = '';

    var url_parts = url.parse(req.url, true);
  resp.writeHead(200, { 'Content-Type': 'text/plain' });
    //resp.writeHead(200, { 'Content-Type': 'application/plain' });
  //console.log (url_parts);


  switch (req.method)
  {
    case "GET" :

      if (url_parts.query.id)
        get_func (url_parts.query.id, resp);
      else {
        //console.log ("show all");
        stream("select * from todo for json path", createConnection(), resp, '[]');
      }
      break;
    case "POST" :
      if (url_parts.query.body)
        add_func (url_parts.query.body);
      output_success (req, resp);
      break;
    case "PUT" :
      if (url_parts.query.body && url_parts.query.id)
        update_func (url_parts.query.id, url_parts.query.body);
      output_success (req, resp);
      break;
    case "DELETE" :
      if (url_parts.query.id)
      del_func (url_parts.query.id);
      output_success (req, resp);
      break;

  }
});

app.set('port', process.env.PORT || 9000);

// Config body-parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.listen(app.get('port'), function () {
  console.log("Server Listening on Port %d in %s mode", app.get('port'));
});
  /*
server.listen(9000, '127.0.0.1', function () {
  console.log('The server is listening on port 9000');
});*/

add_func = function (body) {
console.log ("add_func is called");
  var connection = createConnection();
  var request = createRequest("exec createTodo @todo", connection);
  console.log (request);
  request.addParameter('todo', TYPES.NVarChar, body);

  connection.on('connect', function (err) {
    if (err) {
      throw err;
    }
    connection.execSql(request);
  });
};

/* DELETE single task. */
del_func = function (id) {

  var connection = createConnection();
  var request = createRequest("delete from todo where id = @id", connection);
  console.log (request);
  request.addParameter('id', TYPES.Int, id);

  connection.on('connect', function (err) {
    if (err) {
      throw err;
    }
    connection.execSql(request);
  });
};

/* GET single task. */
get_func = function (id, res) {

  var conn = createConnection();

  var request = createRequest("select * from todo where id = @id for json path, without_array_wrapper", conn);
  console.log (request);
  request.addParameter('id', TYPES.Int, id);
  stream(request, conn, res, '{}');
};

/* PUT update task. */
update_func = function (id, body) {

  var connection = createConnection();
  var request = createRequest("exec updateTodo @id, @todo", connection);
  console.log (request);
  request.addParameter('id', TYPES.Int, id);
  request.addParameter('todo', TYPES.NVarChar, body);

  connection.on('connect', function (err) {
    if (err) {
      throw err;
    }
    connection.execSql(request);
  });
};

//module.exports = router;
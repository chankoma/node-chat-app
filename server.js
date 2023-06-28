const express = require("express");
const bodyParser = require("body-parser");
//const ejs = require("ejs");
const app = express();
const http = require("http");
const server = http.createServer(app);
const io = require("socket.io")(server);
//const PORT = 3000;

const mysql = require('mysql2');
const fetch = require('node-fetch');

require('dotenv').config();


const con = mysql.createConnection({
	host: process.env.db_hostname,
	user: process.env.db_username,
	password: process.env.db_password,
	database: process.env.db_database
})

con.connect(function(err) {
	if (err) throw err;
	console.log('mysql connected')
})

app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "ejs");

app.get("/", (req, res) => {
	res.sendFile(__dirname + "/login.html");
});

app.post("/login", (req, res) => {
	const sql = 'select name from info where pass = ?';
	con.query(sql, req.body.PASS, (err, result, fields) => {
		if (err) throw err;
		//console.log(result[0].name)
		if (req.body.ID && result[0]) {
			res.render("index", {data : req.body.ID, mess : result[0].name})
		}else{
			res.send("password ga tigaimasu!")
		}
	})
});

io.on("connection", (socket) => {
	//console.log("connected user");
	const sql = 'select name from info'
	con.query(sql, (err, result, fields) => {
		if (err) throw err;
		//console.log(result)
		result.forEach(res => {
			socket.on(res.name, (msg) => {
				io.emit(res.name, msg)
			})
		});
	})
});

app.post('/master', (req, res) => {
	if (req.body.MASTER == process.env.master_key) {
		const sql = 'create table if not exists info(id integer primary key auto_increment, name text, pass text, message text)'
		con.query(sql, (err, result, fields) => {
			if (err) throw err;
		})
		const sql2 = 'select * from info'
		con.query(sql2, (err, result, fields) => {
			if (err) throw err;
			res.render('master', {info : result})
		})
	}else if (req.body.MASTER == 'delete') {
		const sql = 'drop table if exists info';
		con.query(sql, (err, result, fields) => {
			if (err) throw err;
			res.send('db delete!')
		})
	}else{
		res.send('masterkey ga tigaimasu!')
	}
})

app.get('/create', (req, res) => {
	res.sendFile(__dirname + '/masta/form.html')
})

app.get('/master', (req, res) => {
	const sql = 'select * from info'
	con.query(sql, (err, result, fields) => {
		if (err) throw err;
		res.render('master', {info : result})
	})
})

app.post('/master/add', (req, res) => {
	const sql = `select pass from info where pass = '${req.body.pass}'`;
	con.query(sql, (err, result, fields) => {
		//console.log(result)
		if (err) throw err;
		if (!result[0] && req.body.pass) {
			const sql_incre = 'set auto_increment_increment = 1';
			con.query(sql_incre, (err, result, fields) => {
				if (err) throw err;
				console.log('increment set');
			})
			const sql_offset = 'set auto_increment_offset = 1';
			con.query(sql_offset, (err, result, fields) => {
				if (err) throw err;
				console.log('offset set');
			})
			const sql = 'insert into info set ?'
			con.query(sql, req.body, (err, result, fields) => {
				if (err) throw err;
				const sql = `select id from info where pass = '${req.body.pass}'`;
				con.query(sql, (err, result, fields) => {
					if (err) throw err;
					fetch(`https://pokeapi.co/api/v2/pokemon/${result[0].id}`)
					.then (res => {
						return res.json();
					})
					.then(poke => {
						console.log(poke.name)
						const sql = `update info set name = '${poke.name}' where id = ${result[0].id}`;
						con.query(sql, (err, result, fields) => {
							if (err) throw err;
							res.redirect('/master')
						})
					})
				});	
			});
		}else{
			res.send("yarinaosi!")
		}
	})
})

app.get('/delete/:id', (req, res) => {
    const sql = "DELETE FROM info WHERE id = ?";
    con.query(sql, [req.params.id], (err, result, fields) => {
        if (err) throw err;
        //console.log(result);
        res.redirect('/master');
    });
});

server.listen(process.env.PORT, () => {
	console.log(`listening on ${process.env.PORT}`);
});

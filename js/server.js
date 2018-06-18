/* Magic Mirror
 * Server
 *
 * By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */

var express = require("express");
var bodyParser = require('body-parser');
var app = require("express")();
var server = require("http").Server(app);
var io = require("socket.io")(server);
var path = require("path");
var ipfilter = require("express-ipfilter").IpFilter;
var fs = require("fs");
var helmet = require("helmet");
var Utils = require(__dirname + "/utils.js");
var Parser = require(__dirname + "/parser.js");
var util = require('util');


var Server = function(config, callback) {

	var port = config.port;
	var modules = config.modules;
	if (process.env.MM_PORT) {
		port = process.env.MM_PORT;
	}
	var fullUrl;
	console.log("Starting server on "+config.address+":" + port + " ... ");

	server.listen(port, config.address ? config.address : null);

	if (config.ipWhitelist instanceof Array && config.ipWhitelist.length == 0) {
		console.info(Utils.colors.warn("You're using a full whitelist configuration to allow for all IPs"))
	}

	app.use(function(req, res, next) {
		fullUrl = req.headers['x-forwarded-proto'] + "://"+req.headers['x-forwarded-host']+ "/dyn_apps/magic-mirror-service";
		res.setHeader('X-Frame-Options', 'GOFORIT');
		var result = ipfilter(config.ipWhitelist, {mode: config.ipWhitelist.length === 0 ? "deny" : "allow", log: false})(req, res, function(err) {
			if (err === undefined) {
				return next();
			}
			console.log(err.message);
			res.status(403).send("This device is not allowed to access your mirror. <br> Please check your config.js or config.js.sample to change this.");
		});
	});

	app.use(bodyParser.urlencoded({ extended: true }));

	app.use(helmet());

	app.use("/js", express.static(__dirname));
	var directories = ["/config", "/css", "/fonts", "/modules", "/vendor", "/translations", "/tests/configs","/pic"];
	var directory;
	for (var i in directories) {
		directory = directories[i];
		app.use(directory, express.static(path.resolve(global.root_path + directory)));
	}

	app.get("/version", function(req,res) {
		res.setHeader('X-Frame-Options', 'GOFORIT');
		res.send(global.version);
	});

	app.get("/", function(req,res) {
		console.log("HALLO SERVER");

		res.setHeader('X-Frame-Options', 'GOFORIT');
		var index = fs.readFileSync(path.resolve(global.root_path + "/start.html"), {encoding: "utf8"});
		var files = fs.readdirSync(path.resolve(global.root_path + "/modules/default/"));
		var moduleList = '';
		var fullUrl = req.headers['x-forwarded-proto'] + "://"+req.headers['x-forwarded-host']+ "/dyn_apps/magic-mirror-service";
		//console.log(req);
		for( f in files ){
			if(!files[f].includes('.')){
				moduleList = moduleList + '<a href="'+fullUrl+'/edit'+files[f]+'"><img class="img1" src="'+fullUrl+'/pic/juwel.png"> Edit the configurations of the module "'+files[f]+'"</a><br>\n';
			}
		}
		index = index.replace("###modules###",moduleList);
		res.send(index.replace(/###proxy###/g,fullUrl));
	});

	// method to edit configuration of modules
	app.get("/edit:moduleName", function(req,res) {
		console.log(req.params.moduleName);
		var module = req.params.moduleName;
		switch(module.toLowerCase()){
			case "config":
				//edit config
				var configText = fs.readFileSync(path.resolve(global.root_path + "/config/config.js"), {encoding: "utf8"});
				var text = Parser.getConfigOptions(util.inspect(configText));
				//console.log(text);
				var html = Parser.buildConfigHTML(util.inspect(text));
				res.setHeader('X-Frame-Options', 'GOFORIT');

				res.send(html.replace(/###PROXY####/g,req.headers['x-forwarded-proto'] + "://"+req.headers['x-forwarded-host'] + "/dyn_apps/magic-mirror-service"));
				break;
			default:
				try{
					var readme = fs.readFileSync(path.resolve(global.root_path + "/modules/default/"+ module+"/README.md"), {encoding: "utf8"});
				} catch( err ){
					console.log("There is no README.md for "+module);
				}
				try{
					var defaults = fs.readFileSync(path.resolve(global.root_path + "/modules/default/"+ module+"/"+ module+".js"), {encoding: "utf8"});
					var description = Parser.getDescriptionOfModule(readme,defaults,module);
					res.setHeader('X-Frame-Options', 'GOFORIT');
					//console.log(util.inspect(req));				
					res.send(description.replace(/###PROXY####/g,req.headers['x-forwarded-proto'] + "://"+req.headers['x-forwarded-host']+ "/dyn_apps/magic-mirror-service"));
				} catch( err ){
					//console.log(err);
					console.log("There is no .js file for "+module+".Maybe wrong module name?");
					res.setHeader('X-Frame-Options', 'GOFORIT');
					res.send("<html><h1>There is no '"+module+"' module.</h1><br><br><h2> Please check your module folder: "+path.resolve(global.root_path + "/modules/default/")+"</h2></html>");
				}
		}
	});

	app.post("/set:moduleName", function(req,res){
		var module = req.params.moduleName;
		switch(module.toLowerCase()){
			case "config":
				//edit config
				config.port = req.body.port;
				config.language = req.body.language;
				config.timeFormat = req.body.timeFormat;
				config.units = req.body.units;
				config.zoom = req.body.zoom;
				config.customCss = req.body.customCss;
				//createModuleConfig();
				fs.writeFileSync(path.resolve(global.root_path + "/config/config.js"),
					("var config = "+util.inspect(config)+";\n\n if (typeof module !== 'undefined') {module.exports = config;}"),{encoding: "utf8"});
				res.send("Please reboot to apply the changes");
				break;
			default:
				module = module.toLowerCase().replace("config","");
				try{
					var defaults = fs.readFileSync(path.resolve(global.root_path + "/modules/default/"+ module+"/"+ module+".js"), {encoding: "utf8"});
				} catch ( err ){
					console.log("There is no .js file for "+moduleName+". Maybe wrong module name?");
					res.send("<html><h1>There is no '"+module+"' module. Please check your module folder: "+path.resolve(global.root_path + "/modules/default/")+"</h1></html>");
				}

				var values = req.body;
				var newConfig = Parser.changeModuleDefaults(defaults,values);

				fs.writeFileSync(path.resolve(global.root_path + "/modules/default/"+ module+"/"+ module+".js"), newConfig,{encoding: "utf8"});

				var fullUrl = req.headers['x-forwarded-proto'] + "://"+req.headers['x-forwarded-host']+ "/dyn_apps/magic-mirror-service";
				res.redirect(fullUrl+"/"+util.inspect(module).replace(/'/g,""));
		}
	});

	app.get("/config", function(req,res) {
		res.setHeader('X-Frame-Options', 'GOFORIT');
		res.send(config);
	});

	app.get("/:modul", function(req, res) {
		res.setHeader('X-Frame-Options', 'GOFORIT');
		var html = fs.readFileSync(path.resolve(global.root_path + "/modul.html"), {encoding: "utf8"});
		html = html.replace("#VERSION#", global.version);
		//console.log(res.URL.pathname);
		var configFile = "config/"+req.params.modul+"_config.js";
		console.log(configFile)
		if (typeof(global.configuration_file) !== "undefined") {
			configFile = global.configuration_file;
		}
		console.log(configFile)
		html = html.replace("#CONFIG_FILE#", configFile);
		//console.log(html);
		res.send(html);
	});


	if (typeof callback === "function") {
		callback(app, io);
	}
};

module.exports = Server;


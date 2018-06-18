var markdown = require('markdown-it')();
var tabletojson = require('tabletojson');
var util = require('util');
var Cleaner = require('./cleaner.js');

/*
*	returns a .html file (as string) with the description of the module and with the current options
*/
function getDescriptionOfModule(content,js,module){

	// render Readme.md to .html
	var markdownHTMLText = markdown.render(content);

	// add header for html file
	var moduleDescriptionHead = '<html>\n'+
						'\t<head>\n'+
						"\t\t<meta charset=\"utf-8\">\n" +
						"\t\t<link rel=\"stylesheet\" href=\"css/readmeCSS.css \">\n" +
                		'\t</head>\n'+
                		'\t<body><div id="content">\n';
    markdownHTMLText = moduleDescriptionHead.concat(markdownHTMLText);

    // replace &lt;code&gt to <code>. analog </code>
	markdownHTMLText = markdownHTMLText.replace(/<code>/g,'&lt;code&gt;').replace(/<\/code>/g,'&lt;/code&gt;');
	//console.log(markdownHTMLText);

	// get tables as json
	var tablesJSON = tabletojson.convert(markdownHTMLText);

	// replace tables with placeholder ###table<Int>###
	var htmlTextWithoutTables = replaceTable(markdownHTMLText,tablesJSON.length);
	//console.log(tablesJSON);

	// if there is no description table at the readme, there is also no description
	if(tablesJSON != null && tablesJSON.toString() != ""){
		try{
			var defaults = getDefaultOptionsObject(js);
			//console.log("[getDescriptionOfModule]\n"+defaults.timeFormat+"\n[/getDescriptionOfModule]");

			// iterate over the tables
			for(var tableIndex = 0; tableIndex < tablesJSON.length; tableIndex++){
				for(var tableEntry = 0; tableEntry < tablesJSON[tableIndex].length; tableEntry++){
					for(var key in tablesJSON[tableIndex][tableEntry]){
						var configOption = tablesJSON[tableIndex][tableEntry][key];
						configOption = configOption.replace(/<code>/g,'').replace(/<\/code>/g,'');
						//console.log(defaults[configOption] );
						if(typeof defaults[configOption] != 'undefined'){
							tablesJSON[tableIndex][tableEntry]["Current Value"] = defaults[configOption];
							try {
								//console.log(util.inspect(defaults[configOption]));
								tablesJSON[tableIndex][tableEntry]["Current Value"] = util.inspect(defaults[configOption]);
							} catch(err){

							}

						}
					}
				}
				var newTable = parseHTMLTableFromJSON(tablesJSON[tableIndex],module);
				//console.log(tablesJSON[tableIndex]);
				htmlTextWithoutTables = htmlTextWithoutTables.replace('###table'+tableIndex+'###',newTable);

			}
			//console.log(tablesJSON);
			// replace &lt; &gt; to < >
			htmlTextWithoutTables = htmlTextWithoutTables.replace(/&lt;/g,'<').replace(/&gt;/g,'>');
			return htmlTextWithoutTables.concat("\t</body>\n</html>");
		} catch( err ){
			console.log(err);
			return;
		}


	}else {

		var endTHead = '\t\t\t\t\t<form action="###PROXY####/set' + capitalizeFirstLetter(module) + 'Config" method="post">\n';
		markdownHTMLText = markdownHTMLText.concat(endTHead);


		var json = getDefaultOptionsObject(js);


		for (var key in json) {

			var attrName = key;
			var attrValue = json[key];


			var htmlVar = "<div class=\"row\">" +
				"\t\t\t<div class=\"col-md-2\"><p>" + attrName + ": </p></div></div>" + wrapWithTableTags(attrValue, key);


			markdownHTMLText = markdownHTMLText.concat(htmlVar);


		}
		markdownHTMLText = markdownHTMLText.concat("<div class=\"row\">" +
			"\t\t\t<div class=\"col-md-4\"><button type=\"submit\">Submit</button></div>\n" +
			"\t\t</div>" +
			"\t\t</form>\n");
	}

	// replace &lt; &gt; to < >
	markdownHTMLText = markdownHTMLText.replace(/&lt;/g,'<');
	markdownHTMLText = markdownHTMLText.replace(/&gt;/g,'>');

	return markdownHTMLText.concat("\t</div></body>\n</html>");;
};

/*
*	Wraps Options recursivley with <td>,<tr>,<table> tags
*/
function wrapWithTableTags(object,id){
	if(object instanceof Array){
		tag = '<td  class="notable"><table  class="notable">';
		for( key in object){
			//console.log("Keys in Array: "+object[key]);
			tag = tag + '<tr class="notable">'+wrapWithTableTags(object[key],id+'['+key+']')+'</tr>';
		}
		tag = tag + '</table></td>';
	}else if(object instanceof Object){
		var keys = Object.keys(object);
		tag = '<td  class="notable"><table>'
		for( var i = 0 ; i < keys.length; i++ ){
			//console.log("Keys in Object: "+keys[i]);
			tag = tag+'<thead><th>'+keys[i]+'</th></thead><tbody>'+wrapWithTableTags(object[keys[i]],id+'['+keys[i]+']')+'</tbody>';
		}
		tag = tag + '</table></td>';
	} else {
		//console.log("[wrapWithTableTags]"+object+"[/wrapWithTableTags]");
		var tag = '<td class="notable"><input type="text" name="'+id+'" id="'+id+'" value="'+util.inspect(object)+'"></td>';
	}
	return tag;
}

/*
*	Get modulename and a json with the tables in the README.md
*	converts the json to a html table
*/
function parseHTMLTableFromJSON(json,module){
	// table start
	var start = '\t\t\t\t<table>\n'+
				'\t\t\t\t\t<thead>\n';

	var startTR = '\t\t\t\t\t\t<tr>\n';

	start = start.concat(startTR);

	// table head
	for(key in json[0]){
		key = key.replace(/Option(_(\d)*)*/,'Option');
		key = key.replace(/Description(_(\d)*)*/,'Description');

		var th = '\t\t\t\t\t\t\t<th>'+key+'</th>\n';
		start = start.concat(th);
	}
	var endTR = '\t\t\t\t\t\t</tr>\n';
	start = start.concat(endTR);

	// form tag for input elements (for option settings)
	var endTHead = '\t\t\t\t\t</thead>\n' +
					'\t\t\t\t\t<form action="###PROXY####/set'+capitalizeFirstLetter(module)+'Config" method="post">\n'+
					'\t\t\t\t\t<tbody>\n';

	start = start.concat(endTHead);
	// iterate over all table rows in json
	for(var tableEntry = 0; tableEntry < json.length; tableEntry++){
		start = start.concat(startTR);
		var option = null;
		for(var key in json[tableEntry]){
			if(option == null){
				option = key;
			}
			// if current key of json is 'currentvalue' create a input elements with the current option value
			if((key.toLowerCase() == 'current value')) {
				// remove <code>, </code> tag from key
				json[tableEntry][option] = json[tableEntry][option].replace(/<code>/,"").replace(/<\/code>/,"");
				//console.log(json[tableEntry][option]);
				// if option value is also an javascript object, create a subtable
				var td = wrapWithTableTags(eval(json[tableEntry][option]+'='+json[tableEntry][key]),json[tableEntry][option]);
				var td = td.replace(/^<td  class="notable">/,'<td>');
				//console.log("Table:"+td);
				
				option = null;
			} else {
				var td = '\t\t\t\t\t\t\t<td>'+json[tableEntry][key]+'</td>\n';
			}
			start = start.concat(td);
		}
		start = start.concat(endTR);
	}

	start = start.concat(startTR);

	// submit button to apply chances
	var submitButton = '\t\t\t\t\t\t\t<td></td><td></td><td><button type="submit">Submit</button></td>\n';

	start = start.concat(submitButton);

	start = start.concat(endTR);

	end = '\t\t\t\t\t</tbody>\n' +
			'\t\t\t\t</form>\n'+
			'\t\t\t\t</table>\n';


	start = start.concat(end);
	//console.log(start);
	return start;
}



/*
*	Parse .js from module (e.g. clock.js)
*	Regex Tester (for javascript)-> https://regex101.com/r/rH0zB0/62
*/
function getDefaultOptionsObject(content){
	/*
	Regex for :
	default: {
		key0: value0,
		key1: value1,
		key2: {
			subkey0 : subvalue0,
			subkey1 : {
				subsubkey0 = : subsubvalue1
			},
		},
	}
	some more stuff...
	*/
	var regex = new RegExp("defaults(\\s|\\t|\\n)*:(\\s|\\t|\\n)*\\{([^()]+)\\}", "i");
	var defaultOptions= regex.exec(content);
	/*
	Regex for :
	default: [
		key0: value0,
		key1: value1,
		key2: {
			subkey0 : subvalue0,
			subkey1 : {
				subsubkey0 = : subsubvalue1
			},
		},
	]
	some more stuff...
	*/
	if(defaultOptions == null){
		// extract default options
		regex = new RegExp("defaults(\\s|\\t|\\n)*:(\\s|\\t|\\n)*\\[([^()]+)\\]", "i");
		var defaultOptions= regex.exec(content);
	}
	defaultOptions[0] = defaultOptions[0].replace(/:/,"=");

	// a little bit unsecure
	// convert string to javascript object
	eval(defaultOptions[0]);

	return defaults;

};

function buildConfigHTML(list){
	// start of the .html file
	list = list.replace(/'/g,"");
	//console.log(list);
	var html = '<!DOCTYPE html>\n'+
				'<html lang="en">\n';

	// adding head string;
	html = html.concat(head);

	var startInputField = '\t<body>\n' +
							'\t<div id="content">\n' +
							'\t\t<div id="header"><h1>Edit Configuration of general configuration</h1></div>\n'+
							'\t\t<form action="###PROXY####/setConfig" method="post">\n';

	html = html.concat(startInputField);
	// parse list
	var json = JSON.parse(list);
	//console.log(json);
	// iterate over all keys in the list, to create input fields
	for(var keys in json){
		var input = '\t\t\t<div class="row">\n'+
					'\t\t\t\t<div class="col-md-2"><p>'+capitalizeFirstLetter(keys)+'</p></div>\n'+
					'\t\t\t\t<div class="col-md-2"><input type="text" name="'+keys+'" id="'+keys+'" value="'+json[keys]+'"></div>\n' +
					'\t\t\t</div>\n';
		html = html.concat(input);
	}
	// submit button
	var button ='\t\t\t<div class="row">\n' +
				'\t\t\t\t<div class="col-md-4"><button type="submit">Submit</button></div>\n'+
				'\t\t\t</div>\n'+
				'\t\t</form>\n' +
				'\t</div>\n' +
				'\t</body>\n' +
				'</html>\n';

	html = html.concat(button);
	//console.log(html);
	return html;
};

function getConfigOptions(configContent){
	var newConfig = configContent.split("config")[1].trim().split("=")[1].split("modules:");

	var modules = "modules:".concat(newConfig[1]);

	var address = newConfig[0].split("address:")[1].split(",")[0].trim().replace(/\\/g,"").replace(/'/g,'"');
	var port = newConfig[0].split("port:")[1].split(",")[0].trim().replace(/\\/g,"").replace(/'/g,'"');
	var kioskmode = newConfig[0].split("kioskmode:")[1].split(",")[0].trim().replace(/\\/g,"").replace(/'/g,'"');
	var ipWhitelist = newConfig[0].split("ipWhitelist:")[1].split("],")[0].trim().concat("]").replace(/\\/g,"").replace(/'/g,'"');
	var language = newConfig[0].split("language:")[1].split(",")[0].trim().replace(/\\/g,"").replace(/'/g,'"');
	var timeFormat = newConfig[0].split("timeFormat:")[1].split(",")[0].trim().replace(/\\/g,"").replace(/'/g,'"');
	var units = newConfig[0].split("units:")[1].split(",")[0].trim().replace(/\\/g,"").replace(/'/g,'"');
	var zoom = newConfig[0].split("zoom:")[1].split(",")[0].trim().replace(/\\/g,"").replace(/'/g,'"');

	var json ='{"address":'+address+','+
				'"port":'+port+','+
				'"kioskmode":'+kioskmode+','+
				'"ipWhitelist":'+ipWhitelist+','+
				'"language":'+language+','+
				'"timeFormat":'+timeFormat+','+
				'"units":'+units+','+
				'"zoom":'+zoom+''+
				'}';


	return json;
}

/*
*	Method to replace old default options through new default options
*/
function changeModuleDefaults(defaults, newdefaults){
	var regex = new RegExp("defaults(\\s|\\t|\\n)*:(\\s|\\t|\\n)*\\{([^()]+)\\}", "i");
	var newdefaults = util.inspect(newdefaults);
	var newdefaults = newdefaults.replace(/\\'/g,'/**/');
	//console.log(newdefaults);
	var newdefaults = newdefaults.replace(/'/g,'');
	//console.log(newdefaults);
	var newdefaults = newdefaults.replace(/\/\*\*\//g,'"');
	//console.log(newdefaults);
	defaults = defaults.replace(regex,"defaults:\n"+newdefaults);
	return defaults;
}

/*
*	Function to remove old tables and replace them with ###table<id>###
*/
function replaceTable(htmlCode,tables){
	for(var i = 0; i < tables; i++){
		htmlCode = htmlCode.replace(/(<table[^>]*>(?:.|\n)*?<\/table>)/,'###table'+i+'###');
	}
	return htmlCode;
}


function capitalizeFirstLetter(str) {
    return String(str).charAt(0).toUpperCase() + String(str).slice(1);
};


module.exports = {
	getDescriptionOfModule : getDescriptionOfModule,
	changeModuleDefaults : changeModuleDefaults,
	getConfigOptions : getConfigOptions,
	buildConfigHTML : buildConfigHTML
}

var config = {address:'localhost',port:' 7000',kioskmode:false,electronOptions:{},ipWhitelist:[ '127.0.0.1', '::ffff:127.0.0.1', '::1' ],language:'en',timeFormat:24,units:'metric',zoom:1,customCss:'css/custom.css',modules:[{ module: 'README.md', position: 'top_left' }],paths:{ modules: 'modules', vendor: 'vendor' },};

 if (typeof module !== 'undefined') {module.exports = config;}
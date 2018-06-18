var config = { address: 'localhost',
  port: '7000',
  kioskmode: false,
  electronOptions: {},
  ipWhitelist: [ '127.0.0.1', '::ffff:127.0.0.1', '::1' ],
  language: 'de',
  timeFormat: '24',
  units: 'metric',
  zoom: '1',
  customCss: undefined,
  modules:
   [ { module: 'updatenotification', position: 'top_left' },
     { module: 'calendar', position: 'top_left' },
     { module: 'alert', position: 'top_left' },
     { module: 'newsfeed', position: 'top_left' },
     { module: 'compliments', position: 'top_left' },
     { module: 'clock', position: 'top_left' },
     { module: 'weatherforecast', position: 'top_left' },
     { module: 'currentweather', position: 'top_left' },
     { module: 'updatenotification', position: 'top_left' },
     { module: 'MMM-bitcoin', position: 'top_left' }],
  paths: { modules: 'modules', vendor: 'vendor' } };

 if (typeof module !== 'undefined') {module.exports = config;}

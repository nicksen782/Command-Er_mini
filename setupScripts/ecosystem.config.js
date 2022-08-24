module.exports = {
	apps : [{
	  name   : "COMMANDER_MINI",
	  script : "/home/pi/MINI/index.js",
	  watch  : false,
	  restart_delay: 2000,
	  instances: 1,
	  out_file: "/dev/null",
	  error_file: "/dev/null"
	}]
  }
  

define([
	"config-override"
],function(CONFIG_OVERRIDE) {
	var config = {
		ROLODEX_BASE_URL: "http://webrtc.hookflash.me",
		IDENTITY_DOMAIN: "unstable.hookflash.me",
		IDENTITY_HOST: "webrtc.hookflash.me"
	};
	if (CONFIG_OVERRIDE) {
		for (var name in CONFIG_OVERRIDE) {
			config[name] = CONFIG_OVERRIDE[name];
		}
	}
	return config;
});

/* Magic Mirror
 * Module: WeatherDependentClothes
 * 
 * By fruestueck based on github.com/MichMich/MagicMirror/blob/master/modules/default/currentweather
 */
Module.register("MMM-WeatherDependentClothes", {
	// Default module config.
	defaults: {		
		lang: config.language,
		
		appid: "", // OpenWeatherMap.org API-Key
		
		// The locationID overrides the location, if both provided.
		location: "Vienna,AT",
		locationID: "", // from openweathermap.org/help/city_list.txt
		
		apiVersion: "2.5",
		apiBase: "https://api.openweathermap.org/data/",
		apiWeatherEndpoint: "forecast",
		
		// Define amount of forecast data sets to be fetched and used
		forecastResultLimit: 3,
		forecastResultLimitExtended: 2,
		
		logForecastResults: false,
		
		units: config.units,
		updateInterval: 20 * 60 * 1000, // 20 Min
		animationSpeed: 3000,
		retryDelay: 4500,
		initialLoadDelay: 1000,
		
		iconPath: "icons/",
		iconScale: 1, // 1.00 = 100 %
		iconSize: 64, // px
		iconSeperator: "extendedForecastSymbol00",
		// A list of clohtes and conditions to be matched for display
		preferences: [
			{
				name: "Freezing",
				icon: "cold",
				conditions: {
					temp_max: 0,
				}
			},
			{
				name: "HeavyRain",
				icon: "wet",
				conditions: {
					rainfall_min: 14,
				}
			},
			{
				name: "HeavyWind",
				icon: "wind",
				conditions: {
					windSpeed_min: 10,
				}
			},
			{
				name: "Sandalen",
				icon: "sandals",
				conditions: {
					temp_min: 28.0,
				}
			},
			{
				name: "Schuhe",
				icon: "shoes",
				conditions: {
					temp_min: 0.0,
					temp_max: 28.0,
				}
			},
			{
				name: "warme Hose",
				icon: "pants-cold",
				conditions: {
					temp_max: 8.0,
				},
			},
			{
				name: "lange Hose",
				icon: "pants",
				conditions: {
					temp_min: 8.0,
					temp_max: 16.0,
				},
			},
			{
				name: "kurze Hose",
				icon: "shorts",
				conditions: {
					temp_min: 16.0,
				},
			},
						{
				name: "Winterjacke",
				icon: "jacket-cold",
				conditions: {
					temp_max: 2.0,
				},
			},
			{
				name: "Jacke",
				icon: "jacket",
				conditions: {
					temp_min: 2.0,
					temp_max: 9.0,
					rainfall_max: 3,
				},
			},
			{
				name: "Regenjacke",
				icon: "jacket-wet",
				conditions: {
					temp_min: 2.0,
					temp_max: 9.0,
					rainfall_min: 3,
				},
			},
			{
				name: "Pullover",
				icon: "hoodie",
				conditions: {
					temp_min: 9.0,
					temp_max: 14.0,
				},
			},
			{
				name: "langes Shirt",
				icon: "shirt",
				conditions: {
					temp_min: 14.0,
					temp_max: 17.0,
				},
			},
			{
				name: "kurzes T-Shirt",
				icon: "shirt-t",
				conditions: {
					temp_min: 17.0,
				},
			},
			{
				name: "Regenschirm",
				icon: "umbrella2",
				conditions: {
					rainfall_min: 4, // mm
				},
			},
			{
				name: "Sonnenbrille",
				icon: "sunglasses",
				conditions: {
					weather: "clear",
				},
			},
			{
				name: "Sonnenbrille",
				icon: "sunglasses",
				conditions: {
					weather: "clouds",
					cloudDensity_max: 50,
				},
			},
			{
				name: "Hut",
				icon: "hat",
				conditions: {
					windSpeed_min: 6.0,
				}
			},
		],
		
	},
	
	// Define required translations.
	getTranslations: function() {
		return false;
	},
	
	// Define start sequence
	start: function() {
		Log.info("Starting module: " + this.name);
		
		this.temperature = null;
		this.temperatureMin = null;
		this.temperatureMax = null;
		this.weatherType = null;
		this.weatherDescription = null;
		this.windSpeed = null;
		this.rainfall = null; // mm
		this.cloudDensity = null; // %
		//this.feelsLike   = null;
		this.loaded = false;
		
		// schedule first update
		this.scheduleUpdate(this.config.initialLoadDelay);
	},
	
	// Override dom generator.
	// Html content for this module will be displayed based on the
	// preferences (weather matchin clothes conditions).
	getDom: function() {
		var wrapper = document.createElement("div");
		
		if(this.config.appid === "") {
			wrapper.innerHTML = "Missing appid of openweathermap.org in the config for module: " + this.name + ".";
			return wrapper;
		}
		
		if (!this.loaded) {
			wrapper.innerHTML = this.translate("LOADING");
			return wrapper;
		}
		
		var forecast = document.createElement("div");
		var forecastExtended = document.createElement("div");
		forecast.setAttribute('style', "display: inline;");
		forecastExtended.setAttribute('style', "display: inline;");
		
		// for each clothing
		for (var p in this.config.preferences) {
			var cloth = this.config.preferences[p];
			let match = [true, true];
			
			// check if any defined conditions doesn't match
			var condition = cloth.conditions;
			
			// Temp condition min<current<=max
			if (typeof condition.temp_min !== "undefined"){
				if (condition.temp_min > this.temperature[0]) match[0] = false;
				if (condition.temp_min > this.temperature[1]) match[1] = false;
			}
			if (typeof condition.temp_max !== "undefined") {
				if (condition.temp_max <= this.temperature[0]) match[0] = false;
				if (condition.temp_max <= this.temperature[1]) match[1] = false;
			}
			// Weather condition != required
			if ((typeof condition.weather !== "undefined") &&
				((condition.weather || '').toLowerCase() != this.weatherType)) {
				match[0] = false;
				//if ((condition.weather || '').toLowerCase() != this.weatherType) {					
					match[1] = false;
				//}
			}
			// Wind Speed condition min<current<=max
			if ((typeof condition.windSpeed_min !== "undefined") &&
				(condition.windSpeed_min > this.windSpeed[0])) {
				match[0] = false;
				if (condition.windSpeed_min > this.windSpeed[1]) {
					match[1] = false;
				}
			}
			if ((typeof condition.windSpeed_max !== "undefined") &&
				(condition.windSpeed_max <= this.windSpeed[0])) {
				match[0] = false;
				if (condition.windSpeed_max <= this.windSpeed[1]) {
					match[1] = false;
				}
			}
			// Rainfall condition min<current<=max
			if ((typeof condition.rainfall_min !== "undefined") &&
				(condition.rainfall_min > this.rainfall[0])) {
				match[0] = false;					
				if (condition.rainfall_min > this.rainfall[1]) {
					match[1] = false;
				}
			}
			if ((typeof condition.rainfall_max !== "undefined") &&
				(condition.rainfall_max <= this.rainfall[0])) {
				match[0] = false;						
				if (condition.rainfall_max <= this.rainfall[1]) {
					match[1] = false;
				}
			}
			
			// Cloud Density condition min<current<=max
			if ((typeof condition.cloudDensity_min !== "undefined") &&
				(condition.cloudDensity_min > this.cloudDensity[0])) {
				match[0] = false;
				if (condition.cloudDensity_min > this.cloudDensity[1]) {
					match[1] = false;
				}
			}
			if ((typeof condition.cloudDensity_max !== "undefined") &&
				(condition.cloudDensity_max <= this.cloudDensity[0])) {
				match[0] = false;
				if (condition.cloudDensity_max <= this.cloudDensity[1]) {
					match[1] = false;
				}
			}
			
			// and display the item
			if (match[0]) {
				var img = document.createElement("img");
				img.setAttribute('src', this.data.path + this.config.iconPath + cloth.icon + ".png");
				img.setAttribute('alt', "["+cloth.name+"]");
				if (this.config.iconScale !== 1) {
					img.setAttribute('style', "height: " + (this.config.iconScale*this.config.iconSize) + "px; width: auto;");
				}
				forecast.appendChild(img);
			} else
			if (match[1]){
				var img = document.createElement("img");
				img.setAttribute('src', this.data.path + this.config.iconPath + cloth.icon + ".png");
				img.setAttribute('alt', "["+cloth.name+"]");
				if (this.config.iconScale !== 1) {
					img.setAttribute('style', "height: " + (this.config.iconScale*this.config.iconSize) + "px; width: auto;");
				}
				forecastExtended.appendChild(img);
			}
		}
		
		wrapper.appendChild(forecast);
		
		// Display Exteneded forecast if items to display exist
		if (forecastExtended.children.length !== 0) {				
			var imgSeperator = document.createElement("img");
			imgSeperator.setAttribute('src', this.data.path + this.config.iconPath + this.config.iconSeperator + ".png");
			imgSeperator.setAttribute('alt', "8|+5");
			imgSeperator.setAttribute('style', "height: " + (this.config.iconScale*this.config.iconSize) 
				+ "px; width: auto; display: inline; padding: 0 5px;");
			wrapper.appendChild(imgSeperator);
			wrapper.appendChild(forecastExtended);
		}
		
		// Log forecast data
		var debugtext = this.temperature + "°C, "
			+ "rain: "+this.rainfall + "mm, " + 
			this.weatherType + ", wind:" + this.windSpeed + " m/s, " +
			"clouds:" +this.cloudDensity + "%";
		if (this.config.logForecastResults) {
			Log.log(debugtext);
		}
	
		return wrapper;
	},
	
	/* getParams()
	 * Generates an url with openweathermap.org api parameters based on the config
	 * return String
	 */	 
	getParams: function() {
		var params = "?";
		if(this.config.locationID) {
			params += "id=" + this.config.locationID;
		} else if (this.config.location) {
			params += "q=" + this.config.location;
		} else {
			// this.hide(100, {lockString:this.identifier});
			return;
		}
		
		params += "&units=" + this.config.units;
		params += "&lang=" + this.config.lang;
		params += "&APPID=" + this.config.appid;
		if (this.config.forecastResultLimit !== 0) {
			// limit forecast results, default to 6 upon undefined
			params += "&cnt=" + (this.config.forecastResultLimit + 
				this.config.forecastResultLimitExtended || 6);
		}
		
		return params;
	},
	
	// updateWeather()
	// Fetches latest weather data and hands it to processWeather(data)
	// Schedules next update with retry-/refresh-delay
	updateWeather: function() {
		if (this.config.appid === "") {
			Log.error(this.name + ": APPID not set!");
			return;
		}
		
		var url = this.config.apiBase + this.config.apiVersion + "/" + this.config.apiWeatherEndpoint + this.getParams();
		var self = this;
		var retry = true;
				
		var weatherRequest = new XMLHttpRequest();
		weatherRequest.open("GET", url, true);
		weatherRequest.onreadystatechange = function() {
			if(this.readyState === 4) {
				if (this.status === 200) {
					self.processWeather(JSON.parse(this.response));
				} else if (this.status === 401) {
					self.updateDom();
					
					Log.error(self.name + ": Incorrect APPID.");
					retry = true;
				} else {
					Log.error(self.name + ": Could not load weather.");
				}
				
				if (retry) {
					self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
				}
			}
		};
		weatherRequest.send();
	},
	
	/* processWeather()
	 * Processes provided weather data, stores needed values into global
	 * variables and calls updateDom()
	 * 
	 * expects openweathermap data
	 */
	processWeather: function(data) {
		// simple check for valid data
		if (!data || !data.list[0].main || typeof data.list[0].main.temp === "undefined") {
			Log.error("processWeather() could not process data. Duping data to log...");
			Log.log(data);
			return;
		}
		
		let decimals = 1;
		this.temperature = [parseFloat(data.list[0].main.temp).toFixed(decimals), 0];
		this.windSpeed = [parseFloat(data.list[0].wind.speed).toFixed(decimals), 0];
		var dLen = data.list.length;
		var cext = this.config.forecastResultLimit;
		if (dLen >= cext) {
			this.temperature[1] = data.list[cext].main.temp;
			this.windSpeed[1] = data.list[cext].wind.speed;
		}
		
		this.weatherType = (data.list[0].weather[0].main || '').toLowerCase(); // e.g. "Rain"
		this.weatherDescription = data.list[0].weather[0].description; // e.g. "leichter Regen"
		
		// prepair
		this.rainfall = [0,0];
		
		this.cloudDensity = [0, 0];
		this.temperatureMin = [this.temperature[0], this.temperature[1]];
		this.temperatureMax = [this.temperature[0], this.temperature[1]];
		if (this.config.logForecastResults) {
			Log.log(data);
		}
		
		// process forcast data
		for (var c in data.list) {
			var forecast = data.list[c];
			var fc = (cext<=c)?1:0; // index: forecast or extended forecast
			// forecast temperature min/max
			if (forecast.main.temp > this.temperatureMax[fc]) {
				this.temperatureMax[fc] = forecast.main.temp;
			} else if (forecast.main.temp < this.temperatureMin[fc]) {
				this.temperatureMin[fc] = forecast.main.temp;
			}
			// sum up parameters: rainfall
			if ((typeof forecast.rain !== "undefined") &&
				(typeof forecast.rain['3h'] !== "undefined")){
				this.rainfall[fc] += forecast.rain['3h'];
			}
			// retrieve hightest parameter: windspeed, clouddenisty
			if ((typeof forecast.clouds !== "undefined") &&
				(typeof forecast.clouds['all'] !== "undefined") &&
				(this.cloudDensity[fc] < forecast.clouds['all'])) {
				this.cloudDensity[fc] = forecast.clouds['all'];
			}
			if ((typeof forecast.wind !== "undefined") && 
				(typeof forecast.wind.speed !== "undefined") &&
				(this.windSpeed[fc] < forecast.wind.speed)){
				this.windSpeed[fc] = forecast.wind.speed;
			}
		}
		this.temperature[0] = parseFloat(this.temperatureMax[0]/2 + this.temperatureMin[0]/2).toFixed(decimals);
		this.temperature[1] = parseFloat(this.temperatureMax[1]/2 + this.temperatureMin[1]/2).toFixed(decimals);
		
		this.rainfall[1] = parseFloat(this.rainfall[1]+this.rainfall[0]).toFixed(decimals);
		this.rainfall[0] = parseFloat(this.rainfall[0]).toFixed(decimals);
		
		//this.feelsLike = null;
		
		this.show(this.config.animationSpeed, {lockString:this.identifier });
		this.loaded = true;
		this.updateDom(this.config.animationSpeed);
	},
	
	
	/* scheduleUpdate()
	 * Schedule next update. Template function
	 * 
	 * argument delay number - Milliseconds before next update. If empty, this.config.updateinterval is used.
	 */
	scheduleUpdate: function(delay) {
		var nextLoad = this.config.updateInterval;
		if (typeof delay != "undefined" && delay >= 0) {
			nextLoad = delay;
		}
		
		var self = this;
		setTimeout(function() {
			self.updateWeather();
		}, nextLoad);
	},
});
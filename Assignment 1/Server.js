"use strict";
const express = require('express')
const fetch = require('cross-fetch');
const app = express()
const port = 3000

const path=require("path")
let publicPath= path.resolve(__dirname,"public")
app.use(express.static(publicPath))

app.get('/api/:Dest', getAPI)

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
function getAPI(req, res) {
    let Destination = req.params.Dest
    fetch('https://api.openweathermap.org/data/2.5/weather?q='+ Destination +'&units=metric&APPID=') //enter key at end
    .then(res => {
        if (res.status >= 400) {
          throw new Error("Bad response from server");
        }
        return res.json();
      })
      .then( results => { 
          var lat = results.coord.lat;
          var lon = results.coord.lon;
          var temp = []; var tempMax = []; var tempMin = []; var wind = []
          var weather = [] ; var rain_level = [];
          var Max, Min, Rain, Pol;

          fetch('https://api.openweathermap.org/data/2.5/onecall?lat='+lat+'&lon='+lon+'&exclude=minutely,hourly,alerts&units=metric&appid=') //enter key at end
          .then(res => {
            if (res.status >= 400) {
              throw new Error("Bad response from server");
            }
            return res.json();
          }).then( results => {
            for(let i = 0; i < 5; i++){
              temp[i] = results.daily[i].temp.day;
              tempMax[i] = results.daily[i].temp.max; 
              tempMin[i] = results.daily[i].temp.min; 
              wind[i] = results.daily[i].wind_speed;
              weather[i] = results.daily[i].weather[0].main;
              rain_level[i] = results.daily[i].weather[0].description;
            }
            Max = getMax(tempMax, Max);
            Min = getMin(tempMin, Min);
            Rain = getRain(weather, Rain);
            return fetch('http://api.openweathermap.org/data/2.5/air_pollution?lat='+lat+'&lon='+lon+'&appid=') //enter key at end
          }).then( res => {
              if (res.status >= 400) {
                throw new Error("Bad response from server");
              }
              return res.json();
          }).then( results => {
            Pol = results.list[0].components.pm2_5
            res.json({temp: temp, tempMax: tempMax, tempMin: tempMin, wind: wind, weather: weather, rain_level: rain_level, Max: Max, Min: Min, Rain: Rain, Pol, Pol})
          })
      })}

function getMax (tempMax, Max){
  Max = tempMax[0]
  for(let i = 0; i < 4; i++){
      if(Max < tempMax[i+1]){
          Max = tempMax[i+1]
      }
  }
  return Max;
}

function getMin (tempMin, Min){
  Min = tempMin[0]
  for(let i = 0; i < 4; i++){
      if(Min > tempMin[i+1]){
          Min = tempMin[i+1]
      }
  }
  return Min;
}

function getRain(weather, Rain){
  Rain = false
  for(let i = 0; i < 5; i++){
    if(weather[i] == 'Rain'){
      Rain = true
    }
  } 
  return Rain
}
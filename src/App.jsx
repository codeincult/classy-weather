import { useEffect } from "react";
import { useState } from "react";

function getWeatherIcon(wmoCode) {
  const icons = new Map([
    [[0], "☀️"],
    [[1], "⛅️"],
    [[2], "⛅️"],
    [[3], "☁️"],
    [[45, 48], "💨"],
    [[51, 56, 61, 66, 80], "⛅"],
    [[53, 55, 63, 65, 57, 67, 81, 82], "🌧️"],
    [[71, 73, 75, 77, 85, 86], "🌧️"],
    [[95], "⛈️"],
    [[96, 99], "⛈️"],
  ]);
  const arr = [...icons.keys()].find((key) => key.includes(wmoCode));
  if (!arr) return "NOT FOUND";
  return icons.get(arr);
}

function convertToFlag(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

function formatDay(dateStr) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
  }).format(new Date(dateStr));
}

export default function App() {
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [displayLocation, setDisplayLocation] = useState("");
  const [weather, setWeather] = useState({});

  useEffect(() => {
    const controller = new AbortController();

    async function getWeather(location) {
      if (location.length < 2) {
        setWeather({});
        return;
      }

      try {
        setIsLoading(true);

        // 1) Getting location (geocoding)
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${location}`,
          { signal: controller.signal },
        );
        const geoData = await geoRes.json();

        if (!geoData.results) throw new Error("Location not found");

        const { latitude, longitude, timezone, name, country_code } = geoData.results.at(0);
        setDisplayLocation(`${name} ${convertToFlag(country_code)}`);

        // 2) Getting actual weather
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=${timezone}&daily=weathercode,temperature_2m_max,temperature_2m_min`,
          { signal: controller.signal },
        );
        const weatherData = await weatherRes.json();
        setWeather(weatherData.daily);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error(err);
        }
      } finally {
        setIsLoading(false);
      }
    }

    getWeather(location);

    return () => {
      controller.abort();
    };
  }, [location]);

  useEffect(() => {
    const lastLocation = localStorage.getItem("location");
    if (lastLocation) {
      setLocation(lastLocation);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("location", location);
  }, [location]);

  return (
    <div className="app">
      <h1>Classy Weather</h1>
      <input
        type="text"
        placeholder="Search location..."
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />

      {isLoading && <p className="loader">Loading...</p>}

      {!isLoading && weather.weathercode && (
        <Weather weather={weather} location={displayLocation} />
      )}
    </div>
  );
}

function Weather({ location, weather }) {
  const { time, weathercode: codes, temperature_2m_max: max, temperature_2m_min: min } = weather;

  return (
    <div>
      <h2>Weather for {location}</h2>
      <ul className="weather">
        {time.map((day, i) => {
          return (
            <Day
              date={formatDay(day)}
              code={codes.at(i)}
              max={max.at(i)}
              min={min.at(i)}
              key={day}
              isToday={i === 0}
            />
          );
        })}
      </ul>
    </div>
  );
}

function Day({ date, code, max, min, isToday }) {
  return (
    <li className="day">
      <span>{getWeatherIcon(code)}</span>
      <p>{isToday ? "Today" : date}</p>
      <p>
        {Math.floor(min)}&deg; &mdash; <strong>{Math.ceil(max)}&deg;</strong>
      </p>
    </li>
  );
}

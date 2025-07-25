(function() {
	"use strict";

    const CSV_URLS = {
        pool: './data/scores-pool.csv',
        semis: './data/scores-semis.csv',
        finals: './data/scores-finals.csv'
      };

      function fetchSheet(url, callback) {
        fetch(url)
          .then(res => res.text())
          .then(csv => Papa.parse(csv, {
            header: true,
            skipEmptyLines: true,
            complete: results => callback(results.data)
          }))
          .catch(err => console.error("Failed to load CSV", err));
      }
      
      function createMatchRow(match, isStriped) {
        const bg = isStriped ? ' bg-[#fdd292]' : '';
        return `
          <li class="p-8${bg}">
            <div class="flex justify-between text-xl italic mb-4 md:mb-0">
              <div>${match['Time']}</div>
              <div>${match['Match Info']}</div>
            </div>
            <div class="flex flex-col md:flex-row justify-between mb-2 items-center flex-wrap gap-1 md:gap-4 md:flex-nowrap">
              <div class="team; flex items-center gap-4 md:w-1/3 ">
                <span class="block text-xl font-bold">${match['Team 1']}</span>
              </div>
              <div class="text-3xl font-bold md:w-1/3  text-center">
                <span>${match['Team 1 Score']}</span>
                -
                <span>${match['Team 2 Score']}</span>
              </div>
              <div class="team; flex items-center gap-4 flex-row-reverse md:w-1/3 md:text-right ">
                <span class="block text-xl font-bold">${match['Team 2']}</span>
              </div>
            </div>
          </li>
        `;
      }
      
      function updateSection(containerId, csvUrl) {
        fetchSheet(csvUrl, matches => {
          const container = document.getElementById(containerId);
          if (!container) return;

          container.innerHTML = '';
          matches.forEach((match, index) => {
            container.innerHTML += createMatchRow(match, index % 2 === 1);
          });
        });
      }
      
      document.addEventListener('DOMContentLoaded', () => {
        updateSection('csvPool', CSV_URLS.pool);
        updateSection('csvSemiFinals', CSV_URLS.semis);
        updateSection('csvFinals', CSV_URLS.finals);
      
        setInterval(() => {
          updateSection('csvPool', CSV_URLS.pool);
          updateSection('csvSemiFinals', CSV_URLS.semis);
          updateSection('csvFinals', CSV_URLS.finals);
        }, 30000); // 30s refresh
      });


})();
(function() {
	"use strict";

    const CSV_URLS = {
        teams: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQu3DNbHLwLO6GPPYO0rWxN_J57AXb-b60yLCQFFh1Pl67DnrjeQieWTPpFtKFEavhO4AyxCm2r1Rjp/pub?gid=1116127067&single=true&output=csv',
        pool: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQu3DNbHLwLO6GPPYO0rWxN_J57AXb-b60yLCQFFh1Pl67DnrjeQieWTPpFtKFEavhO4AyxCm2r1Rjp/pub?gid=0&single=true&output=csv',
        semis: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQu3DNbHLwLO6GPPYO0rWxN_J57AXb-b60yLCQFFh1Pl67DnrjeQieWTPpFtKFEavhO4AyxCm2r1Rjp/pub?gid=301385118&single=true&output=csv',
        finals: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQu3DNbHLwLO6GPPYO0rWxN_J57AXb-b60yLCQFFh1Pl67DnrjeQieWTPpFtKFEavhO4AyxCm2r1Rjp/pub?gid=2025152971&single=true&output=csv'
      };

      function fetchSheet(url, callback) {
        const separator = url.includes('?') ? '&' : '?';

        fetch(`${url}${separator}_=${Date.now()}`, { cache: 'no-store' })
          .then(res => res.text())
          .then(csv => Papa.parse(csv, {
            header: true,
            skipEmptyLines: true,
            complete: results => callback(results.data)
          }))
          .catch(err => console.error("Failed to load CSV", err));
      }

      function escapeHtml(value) {
        return String(value ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      function normalizeTeamName(value) {
        return value === 'Little Rock MEN' ? 'Little Rock Men' : value;
      }

      function shouldDisplayMatch(match) {
        return match['Match Info'] !== "Men's 3/4th Place";
      }

      function isAlumniMatch(match) {
        return /alumni/i.test(match['Match Info']);
      }

      function formatDivisionTitle(division) {
        if (division === "Women's Pool") return "Women's Teams";
        if (division === "Men's Pool") return "Men's Teams";
        return division.replace('/', '').replace(/\s+/g, ' ').trim();
      }

      function createTeamGroup(division, teams, index) {
        const wrapperClass = index === 0 ? 'p-8 mb-8 bg-[#fdd292]' : 'px-8 mb-8';
        const listClass = index === 0
          ? 'text-2xl font-bold'
          : 'p-4 grid gap-x-8 gap-y-1 border border-[#fab31b] text-2xl font-bold sm:grid-cols-2 md:grid-cols-3';

        return `
          <div class="${wrapperClass}">
            <h2 class="text-3xl font-bold mb-4">${escapeHtml(formatDivisionTitle(division))}</h2>
            <ul class="${listClass}">
              ${teams.map(team => `<li>${escapeHtml(normalizeTeamName(team))}</li>`).join('')}
            </ul>
          </div>
        `;
      }

      function updateTeams(containerId, csvUrl) {
        fetchSheet(csvUrl, teams => {
          const container = document.getElementById(containerId);
          if (!container) return;

          const groupedTeams = teams.reduce((groups, row) => {
            const teamName = row['Team Names'];
            const division = row['Division'];
            if (!teamName || !division) return groups;

            if (!groups[division]) groups[division] = [];
            groups[division].push(teamName);
            return groups;
          }, {});

          container.innerHTML = Object.entries(groupedTeams)
            .map(([division, teamList], index) => createTeamGroup(division, teamList, index))
            .join('');
        });
      }
      
      function createMatchRow(match, isStriped) {
        const isAlumni = isAlumniMatch(match);
        const bg = !isAlumni && isStriped ? ' bg-[#fdd292]' : '';
        const rowStyle = isAlumni ? ` style="background-color: ${isStriped ? '#79e1a7' : '#d0eecf'};"` : '';
        const team1Score = match['Team 1 Score'];
        const team2Score = match['Team 2 Score'];
        const hasScoreDisplay = team1Score !== '' || team2Score !== '';

        return `
          <li class="p-8${bg}"${rowStyle}>
            <div class="flex justify-between text-xl italic mb-4 md:mb-0">
              <div>${escapeHtml(match['Time'])}</div>
              <div>${escapeHtml(match['Match Info'])}</div>
            </div>
            <div class="flex flex-col md:flex-row justify-between mb-2 items-center flex-wrap gap-1 md:gap-4 md:flex-nowrap">
              <div class="team; flex items-center gap-4 md:w-1/3 ">
                <span class="block text-xl font-bold">${escapeHtml(normalizeTeamName(match['Team 1']))}</span>
              </div>
              <div class="text-3xl font-bold md:w-1/3  text-center">
                ${hasScoreDisplay ? `
                  <span>${escapeHtml(team1Score)}</span>
                  -
                  <span>${escapeHtml(team2Score)}</span>
                ` : '<span class="text-xl italic font-normal">vs</span>'}
              </div>
              <div class="team; flex items-center gap-4 flex-row-reverse md:w-1/3 md:text-right ">
                <span class="block text-xl font-bold">${escapeHtml(normalizeTeamName(match['Team 2']))}</span>
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
          const visibleMatches = matches.filter(shouldDisplayMatch);

          visibleMatches.forEach((match, index) => {
            container.innerHTML += createMatchRow(match, index % 2 === 1);
          });
        });
      }
      
      document.addEventListener('DOMContentLoaded', () => {
        updateTeams('csvTeams', CSV_URLS.teams);
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

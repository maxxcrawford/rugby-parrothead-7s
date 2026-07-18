(function() {
	"use strict";

    const CSV_URLS = {
        teams: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQu3DNbHLwLO6GPPYO0rWxN_J57AXb-b60yLCQFFh1Pl67DnrjeQieWTPpFtKFEavhO4AyxCm2r1Rjp/pub?gid=1116127067&single=true&output=csv',
        pool: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQu3DNbHLwLO6GPPYO0rWxN_J57AXb-b60yLCQFFh1Pl67DnrjeQieWTPpFtKFEavhO4AyxCm2r1Rjp/pub?gid=0&single=true&output=csv',
        semis: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQu3DNbHLwLO6GPPYO0rWxN_J57AXb-b60yLCQFFh1Pl67DnrjeQieWTPpFtKFEavhO4AyxCm2r1Rjp/pub?gid=301385118&single=true&output=csv',
        finals: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQu3DNbHLwLO6GPPYO0rWxN_J57AXb-b60yLCQFFh1Pl67DnrjeQieWTPpFtKFEavhO4AyxCm2r1Rjp/pub?gid=2025152971&single=true&output=csv'
      };

      const STANDING_WIN_POINTS = 3;
      const STANDING_TIE_POINTS = 1;
      const STANDING_COLUMNS = ['Seed', 'Team', 'GP', 'W', 'L', 'T', 'PF', 'PA', 'PD', 'Pts'];
      const STANDING_TOOLTIPS = {
        GP: 'Games played',
        W: 'Wins',
        L: 'Losses',
        T: 'Ties',
        PF: 'Points for',
        PA: 'Points against',
        PD: 'Point differential',
        Pts: 'Standings points: 3 for a win, 1 for a tie'
      };

      function fetchSheet(url, callback) {
        const separator = url.includes('?') ? '&' : '?';

        return fetch(`${url}${separator}_=${Date.now()}`, { cache: 'no-store' })
          .then(res => res.text())
          .then(csv => new Promise(resolve => {
            Papa.parse(csv, {
              header: true,
              skipEmptyLines: true,
              complete: results => {
                callback(results.data);
                resolve();
              }
            });
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
        const container = document.getElementById(containerId);
        if (!container) return Promise.resolve();

        return fetchSheet(csvUrl, teams => {
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
      
      function createMatchRow(match, isStriped, isOngoing = false) {
        const isAlumni = isAlumniMatch(match);
        const bg = !isAlumni && isStriped ? ' bg-[#fdd292]' : '';
        const isCompleted = Boolean(getPoolDivision(match)) && hasCompletedScore(match);
        const completed = isCompleted ? ' opacity-50' : '';
        const currentMatch = isOngoing ? ' id="current-match"' : '';
        const scrollOffset = isOngoing ? ' scroll-mt-24' : '';
        const rowStyle = isAlumni ? ` style="background-color: ${isStriped ? '#79e1a7' : '#d0eecf'};"` : '';
        const team1Score = match['Team 1 Score'];
        const team2Score = match['Team 2 Score'];
        const hasScoreDisplay = team1Score !== '' || team2Score !== '';

        return `
          <li${currentMatch} class="p-8${bg}${completed}${scrollOffset}"${rowStyle}>
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
                  <div>
                    <span>${escapeHtml(team1Score)}</span>
                    -
                    <span>${escapeHtml(team2Score)}</span>
                  </div>
                  ${isCompleted ? '<div class="text-sm font-normal uppercase tracking-wide">Final</div>' : ''}
                ` : '<span class="text-xl italic font-normal">vs</span>'}
                ${isOngoing ? '<div class="text-sm font-bold uppercase tracking-wide text-[#00ab5a]">Ongoing</div>' : ''}
              </div>
              <div class="team; flex items-center gap-4 flex-row-reverse md:w-1/3 md:text-right ">
                <span class="block text-xl font-bold">${escapeHtml(normalizeTeamName(match['Team 2']))}</span>
              </div>
            </div>
          </li>
        `;
      }
      
      function updateSection(containerId, csvUrl) {
        const container = document.getElementById(containerId);
        if (!container) return Promise.resolve();

        return fetchSheet(csvUrl, matches => {
          container.innerHTML = '';
          const visibleMatches = matches.filter(shouldDisplayMatch);
          const lastCompletedIndex = visibleMatches.reduce((lastIndex, match, index) => {
            return hasCompletedScore(match) ? index : lastIndex;
          }, -1);
          const ongoingIndex = containerId === 'csvPool' && lastCompletedIndex < visibleMatches.length - 1
            ? lastCompletedIndex + 1
            : -1;

          visibleMatches.forEach((match, index) => {
            container.innerHTML += createMatchRow(match, index % 2 === 1, index === ongoingIndex);
          });
        });
      }

      function createStatLabel(column) {
        const tooltip = STANDING_TOOLTIPS[column];
        if (!tooltip) return escapeHtml(column);

        return `
          <span class="stat-tooltip" tabindex="0" title="${escapeHtml(tooltip)}" aria-label="${escapeHtml(`${column}: ${tooltip}`)}">
            <span>${escapeHtml(column)}</span>
            <span class="stat-tooltip__content" role="tooltip">${escapeHtml(tooltip)}</span>
          </span>
        `;
      }

      function createStandingsTable(section, sectionIndex) {
        const bg = sectionIndex % 2 === 0 ? 'bg-[#fdd292]' : 'bg-[#fef0e5]';
        const tableRows = section.rows.map(team => `
          <tr class="border-t border-[#fab31b]">
            ${STANDING_COLUMNS.map(column => {
              const value = column === 'Team' ? normalizeTeamName(team[column]) : team[column];
              const align = column === 'Team' ? 'text-left font-bold' : 'text-center';
              return `<td class="px-3 py-3 text-lg ${align}">${escapeHtml(value)}</td>`;
            }).join('')}
          </tr>
        `).join('');

        const cardRows = section.rows.map(team => `
          <li class="border-2 border-[#fab31b] bg-[#fef0e5]/70 rounded p-5">
            <div class="flex items-start justify-between gap-4 mb-4">
              <h3 class="text-2xl font-bold leading-6">${escapeHtml(normalizeTeamName(team.Team))}</h3>
              <span class="shrink-0 bg-[#fab31b] text-[#b84b3e] rounded px-3 py-1 text-lg font-bold">Seed ${escapeHtml(team.Seed)}</span>
            </div>
            <dl class="grid grid-cols-4 gap-3">
              ${STANDING_COLUMNS.filter(column => column !== 'Seed' && column !== 'Team').map(column => `
                <div>
                  <dt class="text-sm font-bold uppercase">${createStatLabel(column)}</dt>
                  <dd class="text-2xl font-bold">${escapeHtml(team[column])}</dd>
                </div>
              `).join('')}
            </dl>
          </li>
        `).join('');

        return `
          <section class="${bg} text-[#b84b3e] p-6 sm:p-8">
            <h2 class="text-3xl font-bold mb-5">${escapeHtml(section.title)}</h2>
            <div class="hidden md:block overflow-visible">
              <table class="w-full border-collapse">
                <thead>
                  <tr class="bg-[#fab31b] text-[#b84b3e]">
                    ${STANDING_COLUMNS.map(column => {
                      const align = column === 'Team' ? 'text-left' : 'text-center';
                      return `<th class="px-3 py-3 text-lg font-bold ${align}" scope="col">${createStatLabel(column)}</th>`;
                    }).join('')}
                  </tr>
                </thead>
                <tbody class="bg-[#fef0e5]/80">
                  ${tableRows}
                </tbody>
              </table>
            </div>
            <ul class="grid gap-4 md:hidden">
              ${cardRows}
            </ul>
          </section>
        `;
      }

      function getPoolDivision(match) {
        const matchInfo = String(match['Match Info'] ?? '').replace(/\s+/g, ' ').trim();
        if (!/pool/i.test(matchInfo) || /alumni/i.test(matchInfo)) return '';

        return matchInfo.replace(/\s*pool.*$/i, '').trim();
      }

      function createEmptyStanding(team, order) {
        return {
          Seed: 1,
          Team: team,
          GP: 0,
          W: 0,
          L: 0,
          T: 0,
          PF: 0,
          PA: 0,
          PD: 0,
          Pts: 0,
          order
        };
      }

      function createStandingsSection(division) {
        return {
          title: `${division} Standings`,
          teams: new Map()
        };
      }

      function ensureStanding(section, team, order) {
        const normalizedTeam = normalizeTeamName(team);
        if (!section.teams.has(normalizedTeam)) {
          section.teams.set(normalizedTeam, createEmptyStanding(normalizedTeam, order));
        }

        return section.teams.get(normalizedTeam);
      }

      function hasCompletedScore(match) {
        const team1Score = String(match['Team 1 Score'] ?? '').trim();
        const team2Score = String(match['Team 2 Score'] ?? '').trim();

        return team1Score !== ''
          && team2Score !== ''
          && Number.isFinite(Number(team1Score))
          && Number.isFinite(Number(team2Score));
      }

      function applyResult(team, pointsFor, pointsAgainst) {
        team.GP += 1;
        team.PF += pointsFor;
        team.PA += pointsAgainst;
        team.PD = team.PF - team.PA;

        if (pointsFor > pointsAgainst) {
          team.W += 1;
          team.Pts += STANDING_WIN_POINTS;
        } else if (pointsFor < pointsAgainst) {
          team.L += 1;
        } else {
          team.T += 1;
          team.Pts += STANDING_TIE_POINTS;
        }
      }

      function compareStandingRows(teamA, teamB) {
        return teamB.Pts - teamA.Pts
          || teamB.PD - teamA.PD
          || teamB.PF - teamA.PF
          || teamA.PA - teamB.PA
          || teamA.order - teamB.order;
      }

      function hasSameRank(teamA, teamB) {
        return teamA.Pts === teamB.Pts
          && teamA.PD === teamB.PD
          && teamA.PF === teamB.PF
          && teamA.PA === teamB.PA;
      }

      function rankStandingRows(rows) {
        let seed = 1;
        let previousTeam = null;

        return rows.map((team, index) => {
          if (previousTeam && !hasSameRank(team, previousTeam)) {
            seed = index + 1;
          }

          previousTeam = team;
          return { ...team, Seed: seed };
        });
      }

      function buildStandingsFromMatches(matches) {
        const sections = new Map();
        let teamOrder = 0;

        matches.forEach(match => {
          const division = getPoolDivision(match);
          const team1Name = match['Team 1'];
          const team2Name = match['Team 2'];

          if (!division || !team1Name || !team2Name) return;
          if (!sections.has(division)) sections.set(division, createStandingsSection(division));

          const section = sections.get(division);
          const team1 = ensureStanding(section, team1Name, teamOrder++);
          const team2 = ensureStanding(section, team2Name, teamOrder++);

          if (!hasCompletedScore(match)) return;

          const team1Score = Number(String(match['Team 1 Score']).trim());
          const team2Score = Number(String(match['Team 2 Score']).trim());

          applyResult(team1, team1Score, team2Score);
          applyResult(team2, team2Score, team1Score);
        });

        return Array.from(sections.values()).map(section => ({
          title: section.title,
          rows: rankStandingRows(Array.from(section.teams.values()).sort(compareStandingRows))
        }));
      }

      function updateStandings(containerId, csvUrl) {
        const container = document.getElementById(containerId);
        if (!container) return Promise.resolve();

        return fetchSheet(csvUrl, matches => {
          const sections = buildStandingsFromMatches(matches);

          if (sections.length === 0) {
            container.innerHTML = `
              <div class="bg-[#fdd292] text-[#b84b3e] p-8 text-center">
                <h2 class="text-3xl font-bold mb-3">No Pool Matches Found</h2>
                <p class="text-xl leading-6 max-w-2xl mx-auto">Standings will appear once pool matches are available in the live schedule.</p>
              </div>
            `;
            return;
          }

          container.innerHTML = sections
            .map((section, index) => createStandingsTable(section, index))
            .join('');
        });
      }

      function refreshPageData() {
        return Promise.all([
          updateTeams('csvTeams', CSV_URLS.teams),
          updateSection('csvPool', CSV_URLS.pool),
          updateSection('csvSemiFinals', CSV_URLS.semis),
          updateSection('csvFinals', CSV_URLS.finals),
          updateStandings('csvStandings', CSV_URLS.pool)
        ]);
      }

      function setupReloadButton() {
        const button = document.getElementById('reloadData');
        if (!button) return;

        const icon = button.querySelector('i');

        button.addEventListener('click', async () => {
          button.disabled = true;
          button.setAttribute('aria-busy', 'true');
          icon?.classList.add('fa-spin');

          await refreshPageData();

          icon?.classList.remove('fa-spin');
          button.removeAttribute('aria-busy');
          button.disabled = false;
        });
      }
      
      document.addEventListener('DOMContentLoaded', () => {
        refreshPageData();
        setupReloadButton();
        setInterval(refreshPageData, 30000); // 30s refresh
      });


})();

const functions = require("@google-cloud/functions-framework");

functions.http("index", async (req, res) => {
  const { login, year } = req.query;

  const dateRanges = [...Array(12).keys()]
    .toReversed()
    .map((dateRangeIndex) => {
      const now = year ? new Date(Number(year), 11) : new Date();
      return [
        new Date(
          now.getFullYear(),
          now.getMonth() - dateRangeIndex,
          1,
          0,
          -now.getTimezoneOffset()
        ).toISOString(),
        new Date(
          now.getFullYear(),
          now.getMonth() - dateRangeIndex + 1,
          1,
          0,
          -now.getTimezoneOffset()
        ).toISOString(),
      ];
    });

  const query = `
    query($login: String!) {
      user(login: $login) {
        ${dateRanges
          .map(
            ([from, to], dateRangeIndex) => `
              contributions${dateRangeIndex}: contributionsCollection(from: "${from}", to: "${to}") {
                ...contributionsCollectionFields
              }
            `
          )
          .join("")}
      }
    }

    fragment contributionsCollectionFields on ContributionsCollection {
      commitContributionsByRepository {
        contributions(first: 100) {
          nodes {
            commitCount
            occurredAt
          }
        }

        repository {
          nameWithOwner
        }
      }
    }
  `;
  const variables = { login };

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${process.env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const graphql = await response.json();

  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOW_ORIGIN);
  res.json({ dateRanges, graphql });
});

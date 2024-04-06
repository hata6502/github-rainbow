import Color from "color";

const [, , login, year] = process.argv;

const dateRanges = [...Array(12).keys()].toReversed().map((dateRangeIndex) => {
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
const { data } = await response.json();

let dateIndex = 0;
for (const [dateRangeIndex, [from, to]] of dateRanges.entries()) {
  const { commitContributionsByRepository } =
    data.user[`contributions${dateRangeIndex}`];

  for (
    const date = new Date(from);
    date.getTime() < new Date(to).getTime();
    date.setDate(date.getDate() + 1)
  ) {
    const repositoryNameWithOwners = [];

    for (const {
      contributions,
      repository,
    } of commitContributionsByRepository) {
      for (const { commitCount, occurredAt } of contributions.nodes) {
        if (new Date(occurredAt).getDate() === date.getDate()) {
          repositoryNameWithOwners.push(
            ...Array(commitCount).fill(repository.nameWithOwner)
          );
        }
      }
    }

    const hues = repositoryNameWithOwners.map(
      (repositoryNameWithOwner) =>
        ([...repositoryNameWithOwner].reduce(
          // ASCII code only
          (sum, char) => sum + char.codePointAt(0) / 0x80,
          0
        ) %
          1) *
        360
    );
    const hue = hues.length
      ? hues.reduce((sum, hue) => sum + hue, 0) / hues.length
      : 0;
    const lightness =
      100 - 25 * Math.min(repositoryNameWithOwners.length / 10, 1);

    const color = Color(`hsl(${hue} 75% ${lightness}%)`);
    const colorSequence = `\x1b[38;2;${Math.round(color.red())};${Math.round(
      color.green()
    )};${Math.round(color.blue())}m`;
    const resetSequence = "\x1b[0m";
    process.stdout.write(`${colorSequence}■ ${resetSequence}`);
    /*if (dateIndex % 7 === 6) {
      console.log();
    }*/
    dateIndex++;

    //console.error(date, repositoryNameWithOwners);
  }

  //console.log();
}
console.log();

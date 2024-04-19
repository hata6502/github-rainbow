const urlSearchParams = new URLSearchParams(location.search);

const login = urlSearchParams.get("login");
const year = urlSearchParams.get("year");

const loginElement = document.querySelector("#login");
loginElement.defaultValue = login ?? "";
const yearElement = document.querySelector("#year");
yearElement.defaultValue = year ?? "";

const graphTitleElement = document.querySelector("#graph-title");
graphTitleElement.textContent = `${
  login || "hata6502"
}’s public contributions in ${year || "the past year"}`;

const response = await fetch(
  `https://us-central1-almap-408307.cloudfunctions.net/github-rainbow?${new URLSearchParams(
    {
      login: (login || "hata6502").trim(),
      ...(year && { year: year.trim() }),
    }
  )}`
);
const { dateRanges, graphql } = await response.json();

const computeHue = (repositoryNameWithOwner) =>
  ([...repositoryNameWithOwner.split("/")[0]].reduce(
    (sum, char) => sum + char.codePointAt(0) / 0x80,
    0
  ) %
    1) *
  360;

const createCellElement = ({ hue, lightness }) => {
  const cellElement = document.createElement("div");
  cellElement.classList.add("w-2", "h-2");
  cellElement.style.background = `hsl(${hue} 100% ${lightness}%)`;
  return cellElement;
};

const legends = new Set();
const graphElement = document.querySelector("#graph");
for (const [dateRangeIndex, [from, to]] of dateRanges.entries()) {
  const { commitContributionsByRepository } =
    graphql.data.user[`contributions${dateRangeIndex}`];

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
          legends.add(repository.nameWithOwner);
        }
      }
    }

    const leastRepositoryNameWithOwner = [
      ...Map.groupBy(
        repositoryNameWithOwners,
        (repositoryNameWithOwner) => repositoryNameWithOwner
      ),
    ]
      .toSorted(([, a], [, b]) => a.length - b.length)
      .at(0)?.[0];
    const hue = computeHue(leastRepositoryNameWithOwner ?? "");
    const lightness =
      100 - 20 * Math.min(repositoryNameWithOwners.length / 1, 1);

    graphElement.append(createCellElement({ hue, lightness }));
  }
}

const legendsElement = document.querySelector("#legends");
for (const legend of [...legends].toSorted()) {
  const legendElement = document.createElement("div");
  legendElement.classList.add("flex", "items-center", "gap-1");

  legendElement.append(
    createCellElement({ hue: computeHue(legend), lightness: 80 })
  );

  const linkElement = document.createElement("a");
  linkElement.href = `https://github.com/${legend}`;
  linkElement.target = "_blank";
  linkElement.classList.add("font-normal");
  linkElement.textContent = legend;
  legendElement.append(linkElement);

  legendsElement.append(legendElement);
}

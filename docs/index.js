const urlSearchParams = new URLSearchParams(location.search);

const login = urlSearchParams.get("login");
const loginWithDefault = login || "hata6502";
const year = urlSearchParams.get("year");

const loginElement = document.querySelector("#login");
loginElement.defaultValue = login ?? "";
const yearElement = document.querySelector("#year");
yearElement.defaultValue = year ?? "";

const loginImageElement = document.createElement("img");
loginImageElement.src = `https://github.com/${encodeURIComponent(
  loginWithDefault
)}.png`;
loginImageElement.alt = "";
loginImageElement.classList.add("not-prose", "inline", "w-6", "h-6", "mr-1");
const loginLinkElement = document.createElement("a");
loginLinkElement.href = `https://github.com/${encodeURIComponent(
  loginWithDefault
)}`;
loginLinkElement.target = "_blank";
loginLinkElement.append(loginImageElement, loginWithDefault);
const graphTitleElement = document.querySelector("#graph-title");
graphTitleElement.append(
  loginLinkElement,
  `’s public contributions in ${year || "the past year"}`
);

let json;
try {
  const response = await fetch(
    `https://us-central1-almap-408307.cloudfunctions.net/github-rainbow?${new URLSearchParams(
      {
        login: loginWithDefault.trim(),
        ...(year && { year: year.trim() }),
      }
    )}`
  );
  json = await response.json();
  if (json.graphql.errors) {
    throw new Error(json.graphql.errors[0].message);
  }
} catch (exception) {
  const errorElement = document.querySelector("#error");
  errorElement.textContent = String(exception);
  throw exception;
}
const { dateRanges, graphql } = json;

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

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

const computeHue = (str) =>
  ([...str].reduce((sum, char) => sum + char.codePointAt(0) / 0x80, 0) % 1) *
  360;

const createCellElement = ({ hue, lightness }) => {
  const cellElement = document.createElement("div");
  cellElement.classList.add("w-2", "h-2");
  cellElement.style.background = `hsl(${hue} 100% ${lightness}%)`;
  return cellElement;
};

const log = [];
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
          log.push(repository.nameWithOwner);
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
    const hue = computeHue((leastRepositoryNameWithOwner ?? "").split("/")[0]);
    const lightness =
      100 - 20 * Math.min(repositoryNameWithOwners.length / 1, 1);

    graphElement.append(createCellElement({ hue, lightness }));
  }
}

const legends = [
  ...Map.groupBy(
    log,
    (repositoryNameWithOwner) => repositoryNameWithOwner.split("/")[0]
  ),
]
  .map(([owner, repositoryNameWithOwners]) => [
    owner,
    [
      ...Map.groupBy(
        repositoryNameWithOwners,
        (repositoryNameWithOwner) => repositoryNameWithOwner.split("/")[1]
      ),
    ]
      .map(([repositoryName, repositoryNameWithOwners]) => [
        repositoryName,
        repositoryNameWithOwners.length,
      ])
      .toSorted(([, a], [, b]) => b - a),
  ])
  .toSorted(
    ([, a], [, b]) =>
      b.reduce((sum, [, count]) => sum + count, 0) -
      a.reduce((sum, [, count]) => sum + count, 0)
  );

const legendsElement = document.querySelector("#legends");
for (const [owner, repositoryNames] of legends) {
  const countElement = document.createElement("span");
  countElement.classList.add("w-12", "text-right");
  countElement.textContent = String(
    repositoryNames.reduce((sum, [, count]) => sum + count, 0)
  );

  const linkElement = document.createElement("a");
  linkElement.href = `https://github.com/${encodeURIComponent(owner)}`;
  linkElement.target = "_blank";
  linkElement.classList.add("font-normal");
  linkElement.textContent = owner;

  const summaryLabelElement = document.createElement("div");
  summaryLabelElement.classList.add(
    "inline-flex",
    "items-center",
    "gap-1",
    "prose"
  );
  summaryLabelElement.append(countElement, linkElement);
  const summaryElement = document.createElement("summary");
  summaryElement.classList.add(
    "-ml-4",
    "sticky",
    "top-0",
    "bg-white",
    "cursor-pointer",
    "list-outside"
  );
  summaryElement.style.color = `hsl(${computeHue(owner)} 100% 80%)`;
  summaryElement.append(summaryLabelElement);

  const repositoryNameElements = repositoryNames.map(
    ([repositoryName, count]) => {
      const countElement = document.createElement("span");
      countElement.classList.add("w-12", "text-right");
      countElement.textContent = String(count);

      const linkElement = document.createElement("a");
      linkElement.href = `https://github.com/${encodeURIComponent(
        owner
      )}/${encodeURIComponent(repositoryName)}`;
      linkElement.target = "_blank";
      linkElement.classList.add("font-normal");
      linkElement.textContent = repositoryName;

      const repositoryNameElement = document.createElement("div");
      repositoryNameElement.classList.add(
        "flex",
        "items-center",
        "gap-1",
        "-ml-4"
      );
      repositoryNameElement.append(countElement, linkElement);
      return repositoryNameElement;
    }
  );

  const detailsElement = document.createElement("details");
  detailsElement.classList.add("ml-8");
  detailsElement.append(summaryElement, ...repositoryNameElements);
  legendsElement.append(detailsElement);
}

const shareText = `${graphTitleElement.textContent}
${legends
  .map(
    ([owner]) =>
      ["🟧", "🟨", "🟩", "🟦", "🟪", "🟥"][Math.floor(computeHue(owner) / 60)]
  )
  .join("")}
`;
const shareElement = document.querySelector("#share");
const shareButtonElement = document.createElement("a");
shareButtonElement.href = `https://twitter.com/share?${new URLSearchParams({
  text: shareText,
  url: location.href,
  hashtags: "ContributionRainbow",
})}`;
shareButtonElement.target = "_blank";
shareButtonElement.textContent = "Tweet";
shareElement.append(shareButtonElement);

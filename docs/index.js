const urlSearchParams = new URLSearchParams(location.search);

const login = urlSearchParams.get("login");
const loginWithDefault = (login || "hata6502").trim();
const loginElement = document.querySelector("#login");
loginElement.defaultValue = login ?? "";

const computeHue = (str) =>
  ([...str].reduce((sum, char) => sum + char.codePointAt(0) / 0x80, 0) % 1) *
  360;

const createCellElement = ({ hue, lightness }) => {
  const cellElement = document.createElement("div");
  cellElement.classList.add("w-2", "h-2");
  cellElement.style.background = `hsl(${hue} 100% ${lightness}%)`;
  return cellElement;
};

let loading = false;
let year = new Date().getFullYear();
const errorElement = document.querySelector("#error");
const graphElement = document.querySelector("#graph");
const handleIntersection = async () => {
  if (loading) {
    return;
  }
  loading = true;
  try {
    const response = await fetch(
      `https://us-central1-almap-408307.cloudfunctions.net/github-rainbow?${new URLSearchParams(
        {
          login: loginWithDefault,
          year: String(year),
        }
      )}`
    );
    const { dateRanges, graphql } = await response.json();
    if (graphql.errors) {
      throw new Error(json.graphql.errors[0].message);
    }

    const cellElements = [];
    const log = [];
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
        const hue = computeHue(
          (leastRepositoryNameWithOwner ?? "").split("/")[0]
        );
        const lightness =
          100 - 20 * Math.min(repositoryNameWithOwners.length / 1, 1);

        cellElements.push(createCellElement({ hue, lightness }));
      }
    }

    const yearGraphElement = document.createElement("div");
    yearGraphElement.classList.add("flex", "flex-wrap", "gap-1", "mt-2");
    yearGraphElement.append(...cellElements.toReversed());

    const loginImageElement = document.createElement("img");
    loginImageElement.src = `https://github.com/${encodeURIComponent(
      loginWithDefault
    )}.png`;
    loginImageElement.alt = "";
    loginImageElement.classList.add(
      "not-prose",
      "inline",
      "w-6",
      "h-6",
      "mr-1"
    );
    const loginLinkElement = document.createElement("a");
    loginLinkElement.href = `https://github.com/${encodeURIComponent(
      loginWithDefault
    )}`;
    loginLinkElement.target = "_blank";
    loginLinkElement.append(loginImageElement, loginWithDefault);
    const dialogTitleElement = document.createElement("h3");
    dialogTitleElement.classList.add("mt-0");
    dialogTitleElement.append(
      loginLinkElement,
      `’s public contributions in ${year}`
    );

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

    const dialogLegendsElement = document.createElement("div");
    dialogLegendsElement.classList.add("mt-4");
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
      detailsElement.open = true;
      detailsElement.classList.add("ml-8");
      detailsElement.append(summaryElement, ...repositoryNameElements);
      dialogLegendsElement.append(detailsElement);
    }

    const dialogContentElement = document.createElement("div");
    dialogContentElement.classList.add("p-4");
    dialogContentElement.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    dialogContentElement.append(dialogTitleElement, dialogLegendsElement);

    const yearDialogElement = document.createElement("dialog");
    yearDialogElement.classList.add("rounded-lg", "shadow-xl");
    yearDialogElement.addEventListener("click", () => {
      yearDialogElement.close();
    });
    yearDialogElement.append(dialogContentElement);

    const yearHeaderElement = document.createElement("div");
    const headerButtonElement = document.createElement("button");
    headerButtonElement.classList.add(
      "rounded",
      "mt-4",
      "px-2",
      "py-1",
      "text-xs",
      "font-semibold",
      "text-gray-900",
      "ring-1",
      "ring-inset",
      "ring-gray-300",
      "hover:bg-gray-50"
    );
    headerButtonElement.textContent = String(year);
    headerButtonElement.addEventListener("click", () => {
      yearDialogElement.showModal();
    });
    yearHeaderElement.append(headerButtonElement);

    graphElement.append(yearHeaderElement, yearGraphElement, yearDialogElement);
    year--;
  } catch (exception) {
    errorElement.textContent = String(exception);
    throw exception;
  } finally {
    loading = false;

    // https://github.blog/2008-04-10-we-launched/
    if (year < 2008) {
      intersectionObserver.disconnect();
    } else {
      intersectionObserver.observe(errorElement);
    }
  }
};
const intersectionObserver = new IntersectionObserver(handleIntersection);
handleIntersection();

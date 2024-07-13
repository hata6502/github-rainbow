import { JSDOM } from "jsdom";

const query = `
  query {
    search(type: USER, query: "type:user", first: 100) {
      edges {
        node {
          ... on User {
            login
          }
        }
      }
    }
  }
`;
const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `bearer ${process.env.GITHUB_TOKEN}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  body: JSON.stringify({ query }),
});
const graphql = await response.json();

const jsdom = new JSDOM();

const document = new jsdom.window.DOMParser().parseFromString(
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
  "text/xml"
);
const namespaceURI = document.documentElement.namespaceURI;
for (const user of graphql.data.search.edges) {
  const urlElement = document.createElementNS(namespaceURI, "url");

  const locElement = document.createElementNS(namespaceURI, "loc");
  locElement.textContent = `https://rainbow.hata6502.com/?${new URLSearchParams(
    { login: user.node.login }
  )}`;
  urlElement.append(locElement);

  document.documentElement.append(urlElement);
}

console.log(new jsdom.window.XMLSerializer().serializeToString(document));

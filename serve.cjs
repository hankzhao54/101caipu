const fs = require("fs");
const http = require("http");
const path = require("path");

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".pdf": "application/pdf",
};

http.createServer((req, res) => {
  const pathname = decodeURIComponent(req.url.split("?")[0] || "/");
  const filePath = path.join(process.cwd(), pathname === "/" ? "index.html" : pathname);

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    res.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "text/plain; charset=utf-8" });
    res.end(data);
  });
}).listen(4173, () => {
  console.log("Recipe wiki running on http://localhost:4173");
});

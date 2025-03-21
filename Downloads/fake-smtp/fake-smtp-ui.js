const express = require("express");
const { SMTPServer } = require("smtp-server");
const { simpleParser } = require("mailparser");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT_SMTP = 2525;
const PORT_WEB = 3000;

const emails = [];

// SMTP Server
const smtpServer = new SMTPServer({
  authOptional: true,
  onData(stream, session, callback) {
    simpleParser(stream)
      .then(parsed => {
        const customId = parsed.headers.get('x-test-email-id');
        const email = {
          id: customId || uuidv4(),
          from: parsed.from?.text || '',
          to: parsed.to?.text || '',
          subject: parsed.subject || '',
          text: parsed.text || '',
          html: parsed.html || '',
          date: new Date().toISOString(),
        };
        emails.unshift(email);
        console.log("📨 Email received", email.subject);
      })
      .catch(err => console.error("Parsing error:", err))
      .finally(() => callback());
  }
});

smtpServer.listen(PORT_SMTP, () =>
  console.log(`📮 SMTP Server running on port ${PORT_SMTP}`)
);

// Web UI
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("index", { emails });
});

app.get("/email/:id", (req, res) => {
  const email = emails.find(e => e.id === req.params.id);
  if (!email) return res.status(404).send("Email not found");
  res.render("email", { email });
});

// API
app.get("/api/emails", (req, res) => {
  res.json(emails);
});

app.get("/api/emails/:id", (req, res) => {
  const email = emails.find(e => e.id === req.params.id);
  if (!email) return res.status(404).json({ error: "Email not found" });
  res.json(email);
});

app.delete("/api/emails", (req, res) => {
  emails.length = 0;
  res.json({ message: "All emails deleted" });
});

app.listen(PORT_WEB, () =>
  console.log(`🌐 Web UI running at http://localhost:${PORT_WEB}`)
);

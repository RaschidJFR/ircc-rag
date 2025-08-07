import express from 'express';
import proxy from './proxy.js';
import askApi from './ask.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(askApi);
app.use(proxy);

app.get('/', (req, res) => {
  res.redirect('/proxy?url=%2Fen%2Fservices%2Fimmigration-citizenship.html');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const { authorize } = require('express-jwt');

const jwksRsa = require('jwks-rsa');

const checkJwt = authorize({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: 'https://dev-6je86woartrc1pi1.us.auth0.com/.well-known/jwks.json'
  }),
  audience: 'W167A9iGNOl6wtYnkNAkFbgkmclnFf4W',
  issuer: 'https://dev-6je86woartrc1pi1.us.auth0.com/',
  algorithms: ['RS256']
});

app.use(checkJwt);

const tarefasPath = path.join(__dirname, 'tarefas.json'); 

app.use(express.json());
app.use(express.static('public'));

app.get('/callback', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/tarefas', checkJwt, (req, res) => {
  try {
    const userId = req.user.sub; 
    const allTarefas = JSON.parse(fs.readFileSync(tarefasPath, 'utf-8') || '[]');
    const userTarefas = allTarefas.filter(tarefa => tarefa.userId === userId);
    res.json(userTarefas);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/tarefas', checkJwt, (req, res) => {
  const newTarefa = req.body;
  const allTarefas = JSON.parse(fs.readFileSync(tarefasPath, 'utf-8') || '[]');
  allTarefas.push(newTarefa);
  fs.writeFileSync(tarefasPath, JSON.stringify(allTarefas, null, 2), 'utf-8');
  res.status(201).send('Tarefa criada com sucesso!');
});

app.listen(5500, () => console.log('Server running on http://localhost:5500'));

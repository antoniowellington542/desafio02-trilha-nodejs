const express = require('express');
const cors = require('cors');

const { v4: uuidv4, validate } = require('uuid');

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

// MIDDLEWARES

/**
 * Verifica se existe uma conta com o mesmo username passado
 * @param {*} request 
 * @param {*} response 
 * @param {*} next 
 * @returns Caso seja true, retorna a função next. Caso seja false, retorna um código HTTP informando o erro
 */
function checksExistsUserAccount(request, response, next) {
  const { username } = request.headers;

  const user = users.find((u) => u.username === username);

  if(!user) {
    return response.status(404).json({ error: 'User Not Found!'});
  }

  request.user = user;
    
  return next();
}


/**
 * Verifica se o usuario pode criar um novo Todo
 * @param {*} request 
 * @param {*} response 
 * @param {*} next 
 * @returns Caso seja true, retorna a função next. Caso seja false, retorna um código HTTP informando o erro
 */
function checksCreateTodosUserAvailability(request, response, next) {
  const { user } = request;

  if(user.pro != true && user.todos.length === 10){
    return response.status(403).json({ error: 'User Todos is Full!'});
  }else{
    return next();
  }
}

/**
 * Verifica se existe um Todo com o Id passado
 * @param {*} request 
 * @param {*} response 
 * @param {*} next 
 * @returns Caso seja true, retorna a função next. Caso seja false, retorna um código HTTP informando o erro
 */
function checksTodoExists(request, response, next) {
  const { id } = request.params;
  const { username } = request.headers;
  const { user } = request;

  const verifyUser = users.find((u) => u.username === username );

  if(!verifyUser) {
    return response.status(404).json({ error: 'User not Found!'})
  }

  const validId = validate(id);

  if(!validId){
    return response.status(400).json({ error: 'Invalid ID!'})
  }

  const todo = verifyUser.todos.find((t) => t.id === id);

  if(!todo) {
    return response.status(404).json({ error: 'Todo not Found!'})
  }

  request.todo = todo;
  request.user = verifyUser;

  return next();
}

/**
 * Verifica se existe uma conta com o ID passado
 * @param {*} request 
 * @param {*} response 
 * @param {*} next 
 * @returns Caso seja true, retorna a função next. Caso seja false, retorna um código HTTP informando o erro
 */
function findUserById(request, response, next) {
  const { id } = request.params;

  const user = users.find((user) => user.id === id);

  if(!user){
    return response.status(404).json({ error: 'User not Found!'});
  }

  request.user = user;

  return next();
}

// ROTAS

app.post('/users', (request, response) => {
  const { name, username } = request.body;

  const usernameAlreadyExists = users.some((user) => user.username === username);

  if (usernameAlreadyExists) {
    return response.status(400).json({ error: 'Username already exists' });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: []
  };

  users.push(user);

  return response.status(201).json(user);
});

app.get('/users/:id', findUserById, (request, response) => {
  const { user } = request;

  return response.json(user);
});

app.patch('/users/:id/pro', findUserById, (request, response) => {
  const { user } = request;

  if (user.pro) {
    return response.status(400).json({ error: 'Pro plan is already activated.' });
  }

  user.pro = true;

  return response.json(user);
});

app.get('/todos', checksExistsUserAccount, (request, response) => {
  const { user } = request;

  return response.json(user.todos);
});

app.post('/todos', checksExistsUserAccount, checksCreateTodosUserAvailability, (request, response) => {
  const { title, deadline } = request.body;
  const { user } = request;

  const newTodo = {
    id: uuidv4(),
    title,
    deadline: new Date(deadline),
    done: false,
    created_at: new Date()
  };

  user.todos.push(newTodo);

  return response.status(201).json(newTodo);
});

app.put('/todos/:id', checksTodoExists, (request, response) => {
  const { title, deadline } = request.body;
  const { todo } = request;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return response.json(todo);
});

app.patch('/todos/:id/done', checksTodoExists, (request, response) => {
  const { todo } = request;

  todo.done = true;

  return response.json(todo);
});

app.delete('/todos/:id', checksExistsUserAccount, checksTodoExists, (request, response) => {
  const { user, todo } = request;

  const todoIndex = user.todos.indexOf(todo);

  if (todoIndex === -1) {
    return response.status(404).json({ error: 'Todo not found' });
  }

  user.todos.splice(todoIndex, 1);

  return response.status(204).send();
});

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById
};
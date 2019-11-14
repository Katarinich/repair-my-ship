import 'dotenv/config';

import cors from 'cors';
import morgan from 'morgan';
import express from 'express';
import jwt from 'jsonwebtoken';
import { ApolloServer } from 'apollo-server-express';

import schema from './schema';
import resolvers from './resolvers';
import models, { connectDb } from './models';

const app = express();

app.use(
  cors({
    exposedHeaders: 'x-token'
  })
);

app.use(morgan('dev'));

app.use(async (req, res, next) => {
  const token = req.headers['x-token'];

  if (token) {
    try {
      await jwt.verify(token, process.env.SECRET);

      res.setHeader('x-token', token);
    } catch (e) {
      next();
    }
  }

  next();
});

const getUser = token => {
  if (token) {
    try {
      return jwt.verify(token, process.env.SECRET);
    } catch (e) {
      return null;
    }
  }
};

const server = new ApolloServer({
  introspection: true,
  typeDefs: schema,
  resolvers,
  formatError: error => {
    const message = error.message
      .replace('SequelizeValidationError: ', '')
      .replace('Validation error: ', '');

    return {
      ...error,
      message
    };
  },
  context: async ({ req }) => {
    const recaptcha = req.headers['g-recaptcha-response'];
    const token = req.headers['x-token'];

    const user = getUser(token);

    return { models, recaptcha, user, secret: process.env.SECRET };
  }
});

server.applyMiddleware({ app, path: '/graphql' });

const port = process.env.PORT || 8000;

connectDb().then(() => {
  app.listen({ port }, () => {
    console.log(`Apollo Server on http://localhost:${port}/graphql`);
  });
});

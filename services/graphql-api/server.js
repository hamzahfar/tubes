const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const { PubSub } = require('graphql-subscriptions');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const pubsub = new PubSub();

// Enable CORS
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3002', 
    'http://api-gateway:3000', 
    'http://frontend-app:3002' 
  ],
  credentials: true
}));

let courses = [
  {
    id: '1',
    code: 'IF301',
    name: 'Pemrograman Web Lanjut',
    lecturer: 'Pak Budi',
    day: 'Senin',
    time: '08:00 - 10:30',
  },
  {
    id: '2',
    code: 'IF305',
    name: 'Sistem Terdistribusi',
    lecturer: 'Bu Siti',
    day: 'Rabu',
    time: '13:00 - 15:30',
  }
];

let assignments = [
  {
    id: '1',
    courseId: '1',
    title: 'Tugas 1: Microservices',
    deadline: '2023-12-20',
    status: 'Pending', 
  }
];

const typeDefs = `
  type Course {
    id: ID!
    code: String!
    name: String!
    lecturer: String!
    day: String!
    time: String!
    assignments: [Assignment]
  }

  type Assignment {
    id: ID!
    courseId: ID!
    title: String!
    deadline: String!
    status: String!
    course: Course
  }

  type Query {
    courses: [Course!]!
    course(id: ID!): Course
    assignments(courseId: ID): [Assignment!]!
  }

  type Mutation {
    addCourse(code: String!, name: String!, lecturer: String!, day: String!, time: String!): Course!
    
    addAssignment(courseId: ID!, title: String!, deadline: String!): Assignment!
    
    updateAssignmentStatus(id: ID!, status: String!): Assignment!
    
    deleteAssignment(id: ID!): Boolean!
  }

  type Subscription {
    assignmentAdded: Assignment!
  }
`;

const resolvers = {
  Query: {
    courses: () => courses,
    course: (_, { id }) => courses.find(c => c.id === id),
    assignments: (_, { courseId }) => {
      if (courseId) return assignments.filter(a => a.courseId === courseId);
      return assignments;
    },
  },

  Course: {
    assignments: (parent) => assignments.filter(a => a.courseId === parent.id),
  },

  Assignment: {
    course: (parent) => courses.find(c => c.id === parent.courseId),
  },

  Mutation: {
    addCourse: (_, { code, name, lecturer, day, time }) => {
      const newCourse = {
        id: uuidv4(),
        code,
        name,
        lecturer,
        day,
        time,
      };
      courses.push(newCourse);
      return newCourse;
    },

    addAssignment: (_, { courseId, title, deadline }) => {
      // Validasi: Pastikan course ada
      const courseExists = courses.find(c => c.id === courseId);
      if (!courseExists) {
        throw new Error('Mata kuliah tidak ditemukan!');
      }

      const newAssignment = {
        id: uuidv4(),
        courseId,
        title,
        deadline,
        status: 'Pending',
      };
      assignments.push(newAssignment);
      
      // Publish notifikasi real-time
      pubsub.publish('ASSIGNMENT_ADDED', { assignmentAdded: newAssignment });
      
      return newAssignment;
    },

    updateAssignmentStatus: (_, { id, status }) => {
      const idx = assignments.findIndex(a => a.id === id);
      if (idx === -1) throw new Error('Tugas tidak ditemukan');
      
      assignments[idx].status = status;
      return assignments[idx];
    },

    deleteAssignment: (_, { id }) => {
      const idx = assignments.findIndex(a => a.id === id);
      if (idx === -1) return false;

      assignments.splice(idx, 1);
      return true;
    },
  },

  Subscription: {
    assignmentAdded: {
      subscribe: () => pubsub.asyncIterator(['ASSIGNMENT_ADDED']),
    },
  },
};

async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({ req }),
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  const PORT = process.env.PORT || 4000;
  
  const httpServer = app.listen(PORT, () => {
    console.log(`🚀 GraphQL API Server (KuliahMate) running on port ${PORT}`);
    console.log(`📡 GraphQL endpoint: http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`🔔 Subscriptions ready`);
  });

  server.installSubscriptionHandlers(httpServer);

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    httpServer.close(() => {
      console.log('Process terminated');
    });
  });
}

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'graphql-api-kuliahmate',
    timestamp: new Date().toISOString(),
    data: {
      coursesCount: courses.length,
      assignmentsCount: assignments.length
    }
  });
});

app.use((err, req, res, next) => {
  console.error('GraphQL API Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

startServer().catch(error => {
  console.error('Failed to start GraphQL server:', error);
  process.exit(1);
});
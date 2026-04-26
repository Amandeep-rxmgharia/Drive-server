import mongoose from "mongoose";
import { connectDB } from "./db.js";

await connectDB();
const client = mongoose.connection.getClient();

try {
  const db = mongoose.connection.db;
  const command = "collMod";

  await db.command({
    [command]: "users",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: [
          "_id",
          "name",
          "email",
          "rootDirId",
          "provider",
          "role",
          "deleted",
          'maxStorageInBytes'
        ],
        properties: {
          _id: {
            bsonType: "objectId",
          },
          name: {
            bsonType: "string",
            minLength: 3,
            description:
              "name field should a string with at least three characters",
          },
          email: {
            bsonType: "string",
            description: "please enter a valid email",
            pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$",
          },
          password: {
            bsonType: "string",
            minLength: 4,
          },
          rootDirId: {
            bsonType: "objectId",
          },
          provider: {
            bsonType: ["string", "null"],
          },
          profilePic: {
            bsonType: "string",
          },
          role: {
            enum: ["Admin", "Manager", "User", "Owner"],
          },
          deleted: {
            bsonType: "bool",
          },
          maxStorageInBytes: {
            bsonType: 'long'
          },
          __v: {
            bsonType: "int",
          },
        },
        additionalProperties: false,
      },
    },
    validationAction: "error",
    validationLevel: "strict",
  });

  await db.command({
    [command]: "directories",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: [
          "_id",
          "name",
          "userId",
          "parentDirId",
          "createdAt",
          "updatedAt",
          "size",
          "path",
          "numOfFiles",
          "numOfFolders",
        ],
        properties: {
          _id: {
            bsonType: "objectId",
          },
          name: {
            bsonType: "string",
          },
          userId: {
            bsonType: "objectId",
          },
          parentDirId: {
            bsonType: ["objectId", "null"],
          },
          updatedAt: {
            bsonType: "string",
          },
          createdAt: {
            bsonType: "string",
          },
          size: {
            bsonType: "long",
          },
          path: {
            bsonType: "array",
          },
          numOfFolders: {
            bsonType: "int",
          },
          numOfFiles: {
            bsonType: "int",
          },
          __v: {
            bsonType: "int",
          },
        },
        additionalProperties: false,
      },
    },
    validationAction: "error",
    validationLevel: "strict",
  });

  await db.command({
    [command]: "files",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: [
          "_id",
          "name",
          "extension",
          "userId",
          "parentDirId",
          "sharing",
          "permissions",
          "createdAt",
          "updatedAt",
          "size",
          "path",
        ],
        properties: {
          _id: {
            bsonType: "objectId",
          },
          sharing: {
            bsonType: "object",
            properties: {
              access: {
                enum: ["restricted", "anyone"],
              },
              shareToken: {
                bsonType: ["string", "null"],
              },
              expiresAt: {
                bsonType: ["date", "null"],
                description: "link expiration date",
              },
            },
          },
          permissions: {
            bsonType: "array",
            items: {
              bsonType: "object",
              required: ["user", "role"],
              properties: {
                user: {
                  bsonType: "string",
                  description: "user who has access",
                },
                role: {
                  enum: ["viewer", "editor"],
                  description: "permission role",
                },
              },
            },
          },
          name: {
            bsonType: "string",
          },
          extension: {
            bsonType: "string",
          },
          userId: {
            bsonType: "objectId",
          },
          parentDirId: {
            bsonType: "objectId",
          },
          __v: {
            bsonType: "int",
          },
          updatedAt: {
            bsonType: "string",
          },
          createdAt: {
            bsonType: "string",
          },
          size: {
            bsonType: "long",
          },
          path: {
            bsonType: "array",
          },
        },
        additionalProperties: false,
      },
    },
    validationAction: "error",
    validationLevel: "strict",
  });
} catch (err) {
  console.log("Error setting up the database", err);
} finally {
  await client.close();
}

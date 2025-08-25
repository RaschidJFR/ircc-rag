import { OpenAIEmbeddings } from '@langchain/openai';
import { MongoClient } from 'mongodb';
import { MONGODB_URI, OPENAI_API_KEY, EMBEDDING_MODEL, VECTOR_INDEX_NAME } from './vars.mjs';

const DB_NAME = 'IRCC_RAG';
const COLLECTION_NAME = 'chunks';
const mongoClient = new MongoClient(MONGODB_URI, {});
const collection = mongoClient.db(DB_NAME).collection(COLLECTION_NAME);

export async function vectorSearch(query, { numCandidates, limit } = { numCandidates: 500, limit: 10 }) {
  const embeddings = await new OpenAIEmbeddings({
    openAIApiKey: OPENAI_API_KEY,
    model: EMBEDDING_MODEL,
  }).embedQuery(query);

  await openMongoConnection();

  // Any change to these parameters alters the amount of results passed to the LLM,
  // thus change the context and the quality of the answer.
  const results = await collection
    .aggregate([
      {
        $vectorSearch: {
          queryVector: embeddings,
          path: 'embedding',
          index: VECTOR_INDEX_NAME,
          numCandidates,
          limit,
        },
      },
      // Omit documents without a refUrl.
      {
        $match: {
          refUrl: {
            $not: {
              $in: [null, '', false],
            },
          },
        },
      },
      ...dedup(),
      ...getContextReconstructionAggregationStages(),
      {
        $project: {
          _id: 0,
          refUrl: 1,
          text: 1,
        },
      },
    ])
    .toArray();

  return results;
}

/**
 * Deduplicates documents by refUrl and loc.lines.from/to.
 * This is necessary if there are duplicate chunks created during embedding.
 */
function dedup() {
  return [
    {
      $group: {
        _id: {
          refUrl: '$refUrl',
          from: '$loc.lines.from',
          to: '$loc.lines.to',
        },
        refUrl: {
          $first: '$refUrl',
        },
        text: {
          $first: '$text',
        },
        loc: {
          $first: '$loc',
        },
      },
    },
  ];
}

/**
 * This aggregation pipeline merges documents resulting from the vector search by refUrl and adds the field `mainTopic`.
 * @returns {Array<Object>} Aggregation pipeline stages for reconstructing context from related documents.
 */
function getContextReconstructionAggregationStages() {
  return [
    // Sort and group documents by refUrl to reconstruct context.
    {
      $sort: {
        refUrl: 1,
        'loc.lines.from': 1,
      },
    },
    {
      $group: {
        _id: '$refUrl',
        minLoc: {
          $min: '$loc.lines.from',
        },
        text: {
          $push: '$text',
        },
      },
    },
    // Context reconstruction:
    // Retrieve the first chunk of the related document as the Main Topic.
    {
      $lookup: {
        from: 'chunks',
        let: {
          refUrl: '$_id',
          minLoc: '$minLoc',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$refUrl', '$$refUrl'],
                  },
                  // Skip chunks already included in the previous results.
                  {
                    $ne: ['$loc.lines.from', '$$minLoc'],
                  },
                ],
              },
            },
          },
          // Take only the top-most chunk (the beginning of the document)
          {
            $sort: {
              'loc.lines.from': 1,
            },
          },
          {
            $limit: 1,
          },
        ],
        as: 'mainTopic',
      },
    },
    {
      $addFields: {
        mainTopic: {
          $arrayElemAt: ['$mainTopic', 0],
        },
        text: {
          $reduce: {
            input: '$text',
            initialValue: '',
            in: {
              $concat: ['$$value', '$$this', '\n\n\\[...\\]\n\n* * * \n\n'],
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        text: {
          $concat: ['$mainTopic.text', '\n\n\\[...\\]\n\n* * * \n\n', '$text'],
        },
        refUrl: '$_id',
      },
    },
  ];
}

/**
 * Converts an array of chunks into a Markdown-formatted string.
 *
 * @param {Array<Object>} chunks - An array of chunk objects to be converted.
 * @param {string} chunks[].refUrl - The reference URL associated with the chunk.
 * @param {string} chunks[].text - The text content of the chunk.
 * @param {string?} chunks[].mainTopic - The initial text chunk in the related full document.
 * @returns {string} A Markdown-formatted string containing the chunk text and references.
 */
export function chunksToMarkdown(chunks, startIndex = 0) {
  return chunks
    .map(({ refUrl, text, mainTopic }, i) => {
      // TO-DO: implement text fragment highlight
      // const firstSentence = removeMd(text).match(/[\w, -]{12,}/).at(0);
      // const lastSentence = removeMd(text).match(/[\w, -]{12,}/g).at(-1);
      // let url = refUrl;
      // if (firstSentence && lastSentence && firstSentence !== lastSentence) {
      //   url = `${refUrl}#:~:text=${encodeURI(firstSentence)},${encodeURI(lastSentence)}`;
      // }

      const SEPARATOR = '\n\n\\[...\\]\n\n* * * \n\n';
      return `${mainTopic ? mainTopic + SEPARATOR : ''}${text}\n\nReference [${
        i + 1 + startIndex
      }]: ${refUrl}\n-----------------------------\n\n`;
    })
    .join('\n');
}

async function openMongoConnection() {
  await mongoClient.connect();
  return mongoClient;
}

export async function closeConnection() {
  await mongoClient?.close();
}

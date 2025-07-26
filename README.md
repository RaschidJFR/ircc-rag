## IRCC RAG Chatbot
This is a work in progress of a chatbot to answer immigration questions by consulting IRCC's official online documentation.

**Getting Started**

1. Install dependencies: `npm install`
2. Populate the `.env`file (see [`.env.example`](./.env.example))
3. Download resources (html and pdf files) from IRCC's website:`node resources/download.js`
4. Create embeddings in a MongoDB database: `node resources/embeddings.js "<path to folder containing the downloaded .html files>"`
5. Start a chat session from the command line: `npm start`

**To do:**

- [x] Run `node resources/download` to fetch all resources from `ircc.canada.ca`. HTML and PDF files will be saved in `resources/downloads`.
- [ ] Run `node resources/process <path to .html file>` to vectorize and store data:
    - [x] Generate chunks and metadata from html files
    - [ ] Generate chunks and metadata from pdf files
    - [x] Vectorize chunks
    - [x] Store in database
- [ ] Ensure links to all relevant sources are included in the response
  - [ ] Link to text fragments
- [ ] Build and deploy a web UI
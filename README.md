## Work In Progress

**To do:**

- [x] Run `node resources/download` to fetch all resources from `ircc.canada.ca`. HTML and PDF files will be saved in `resources/downloads`.
- [ ] Run `node resources/process <path to .html file>` to vectorize and store data:
    - [x] Generate chunks and metadata from html files
    - [ ] Generate chunks and metadata from pdf files
    - [ ] Vectorize chunks
    - [ ] Store in database
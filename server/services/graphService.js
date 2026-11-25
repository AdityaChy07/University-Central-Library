const { getNeo4jSession, getNeo4jStatus } = require('../config/neo4j');

/**
 * Neo4j Graph Service
 * Handles Cypher operations, relationship modeling (WROTE, BORROWED),
 * and MongoDB-Neo4j data synchronization.
 */

// Format date to ISO string for Cypher
const toIso = (date) => (date ? new Date(date).toISOString() : null);

/**
 * Sync Author to Neo4j
 */
const syncAuthor = async (author) => {
  const session = getNeo4jSession();
  try {
    const cypher = `
      MERGE (a:Author {mongoId: $authorId})
      SET a.name = $authorName,
          a.country = $country,
          a.biography = $biography,
          a.updatedAt = datetime()
      RETURN a
    `;
    await session.executeWrite((tx) =>
      tx.run(cypher, {
        authorId: author._id.toString(),
        authorName: author.name || '',
        country: author.country || '',
        biography: author.biography || '',
      })
    );
    return { success: true };
  } catch (err) {
    console.warn(`[GraphService] Author sync warning (${author._id}):`, err.message);
    return { success: false, error: err.message };
  } finally {
    await session.close();
  }
};

/**
 * Delete Author from Neo4j
 */
const deleteAuthorNode = async (authorId) => {
  const session = getNeo4jSession();
  try {
    const cypher = `
      MATCH (a:Author {mongoId: $authorId})
      DETACH DELETE a
    `;
    await session.executeWrite((tx) =>
      tx.run(cypher, { authorId: authorId.toString() })
    );
    return { success: true };
  } catch (err) {
    console.warn(`[GraphService] Author delete warning (${authorId}):`, err.message);
    return { success: false, error: err.message };
  } finally {
    await session.close();
  }
};

/**
 * Sync Book and Author-WROTE-Book relationship to Neo4j
 */
const syncBook = async (book, author) => {
  const session = getNeo4jSession();
  try {
    const authorId = (author?._id || book.authorId)?._id?.toString() || (author?._id || book.authorId)?.toString();
    const authorName = author?.name || 'Unknown Author';

    const cypher = `
      MERGE (b:Book {mongoId: $bookId})
      SET b.title = $bookTitle,
          b.isbn = $isbn,
          b.category = $category,
          b.quantity = toInteger($quantity),
          b.availableCopies = toInteger($availableCopies),
          b.updatedAt = datetime()
      WITH b
      MERGE (a:Author {mongoId: $authorId})
      ON CREATE SET a.name = $authorName
      MERGE (a)-[r:WROTE]->(b)
      RETURN b, a, r
    `;

    await session.executeWrite((tx) =>
      tx.run(cypher, {
        bookId: book._id.toString(),
        bookTitle: book.title,
        isbn: book.isbn,
        category: book.category || 'General',
        quantity: Number(book.quantity || 1),
        availableCopies: Number(book.availableCopies || 0),
        authorId: authorId || 'unknown_author',
        authorName: authorName,
      })
    );
    return { success: true };
  } catch (err) {
    console.warn(`[GraphService] Book sync warning (${book._id}):`, err.message);
    return { success: false, error: err.message };
  } finally {
    await session.close();
  }
};

/**
 * Delete Book from Neo4j
 */
const deleteBookNode = async (bookId) => {
  const session = getNeo4jSession();
  try {
    const cypher = `
      MATCH (b:Book {mongoId: $bookId})
      DETACH DELETE b
    `;
    await session.executeWrite((tx) =>
      tx.run(cypher, { bookId: bookId.toString() })
    );
    return { success: true };
  } catch (err) {
    console.warn(`[GraphService] Book delete warning (${bookId}):`, err.message);
    return { success: false, error: err.message };
  } finally {
    await session.close();
  }
};

/**
 * Sync Member to Neo4j
 */
const syncMember = async (member) => {
  const session = getNeo4jSession();
  try {
    const cypher = `
      MERGE (m:Member {mongoId: $mongoId})
      SET m.memberId = $memberId,
          m.name = $name,
          m.email = $email,
          m.phone = $phone,
          m.active = $active,
          m.updatedAt = datetime()
      RETURN m
    `;
    await session.executeWrite((tx) =>
      tx.run(cypher, {
        mongoId: member._id.toString(),
        memberId: member.memberId,
        name: member.name,
        email: member.email,
        phone: member.phone || '',
        active: Boolean(member.active),
      })
    );
    return { success: true };
  } catch (err) {
    console.warn(`[GraphService] Member sync warning (${member._id}):`, err.message);
    return { success: false, error: err.message };
  } finally {
    await session.close();
  }
};

/**
 * Delete Member from Neo4j
 */
const deleteMemberNode = async (memberId) => {
  const session = getNeo4jSession();
  try {
    const cypher = `
      MATCH (m:Member {mongoId: $memberId})
      DETACH DELETE m
    `;
    await session.executeWrite((tx) =>
      tx.run(cypher, { memberId: memberId.toString() })
    );
    return { success: true };
  } catch (err) {
    console.warn(`[GraphService] Member delete warning (${memberId}):`, err.message);
    return { success: false, error: err.message };
  } finally {
    await session.close();
  }
};

/**
 * Record Book Issue in Neo4j
 * Creates/merges Member -[:BORROWED]-> Book relationship
 */
const recordIssue = async (borrowRecord, member, book) => {
  const session = getNeo4jSession();
  try {
    const cypher = `
      MERGE (m:Member {mongoId: $memberId})
      ON CREATE SET m.name = $memberName, m.memberId = $customMemberId
      MERGE (b:Book {mongoId: $bookId})
      ON CREATE SET b.title = $bookTitle, b.isbn = $isbn
      MERGE (m)-[r:BORROWED {borrowRecordId: $recordId}]->(b)
      SET r.issueDate = $issueDate,
          r.dueDate = $dueDate,
          r.status = "ISSUED",
          r.returnDate = null,
          r.fineAmount = 0,
          r.overdueDays = 0,
          r.updatedAt = datetime()
      RETURN r
    `;

    await session.executeWrite((tx) =>
      tx.run(cypher, {
        memberId: member._id ? member._id.toString() : member.toString(),
        memberName: member.name || 'Member',
        customMemberId: member.memberId || '',
        bookId: book._id ? book._id.toString() : book.toString(),
        bookTitle: book.title || 'Book',
        isbn: book.isbn || '',
        recordId: borrowRecord._id.toString(),
        issueDate: toIso(borrowRecord.issueDate),
        dueDate: toIso(borrowRecord.dueDate),
      })
    );
    return { success: true };
  } catch (err) {
    console.warn(`[GraphService] Issue sync warning (${borrowRecord._id}):`, err.message);
    return { success: false, error: err.message };
  } finally {
    await session.close();
  }
};

/**
 * Record Book Return in Neo4j
 * Updates Member -[:BORROWED]-> Book status to RETURNED and records fine
 */
const recordReturn = async (borrowRecord, member, book) => {
  const session = getNeo4jSession();
  try {
    const cypher = `
      MATCH (m:Member {mongoId: $memberId})-[r:BORROWED {borrowRecordId: $recordId}]->(b:Book {mongoId: $bookId})
      SET r.status = "RETURNED",
          r.returnDate = $returnDate,
          r.fineAmount = toInteger($fineAmount),
          r.overdueDays = toInteger($overdueDays),
          r.updatedAt = datetime()
      RETURN r
    `;

    await session.executeWrite((tx) =>
      tx.run(cypher, {
        memberId: (member._id || member).toString(),
        bookId: (book._id || book).toString(),
        recordId: borrowRecord._id.toString(),
        returnDate: toIso(borrowRecord.returnDate),
        fineAmount: Number(borrowRecord.fineAmount || 0),
        overdueDays: Number(borrowRecord.overdueDays || 0),
      })
    );
    return { success: true };
  } catch (err) {
    console.warn(`[GraphService] Return sync warning (${borrowRecord._id}):`, err.message);
    return { success: false, error: err.message };
  } finally {
    await session.close();
  }
};

/**
 * Fetch full Graph dataset (nodes & relationships) for Graph Explorer visualization
 */
const getGraphData = async () => {
  const status = await getNeo4jStatus();
  if (!status.connected) {
    return { connected: false, nodes: [], links: [], message: 'Neo4j is not connected.' };
  }

  const session = getNeo4jSession();
  try {
    // 1. Fetch Authors and Books (WROTE)
    const authorBookCypher = `
      MATCH (a:Author)-[r:WROTE]->(b:Book)
      RETURN a, r, b
      LIMIT 150
    `;

    // 2. Fetch Members and Books (BORROWED)
    const memberBookCypher = `
      MATCH (m:Member)-[r:BORROWED]->(b:Book)
      RETURN m, r, b
      LIMIT 150
    `;

    // 3. Fetch standalone Authors/Books/Members without relationships
    const standaloneCypher = `
      MATCH (n)
      WHERE NOT (n)--()
      RETURN n
      LIMIT 50
    `;

    const nodesMap = new Map();
    const links = [];

    const addNode = (props, label) => {
      const id = props.mongoId || props.memberId || props.isbn || Math.random().toString();
      if (!nodesMap.has(id)) {
        nodesMap.set(id, {
          id: id,
          label: label,
          name: props.name || props.title || id,
          title: props.title,
          isbn: props.isbn,
          category: props.category,
          memberId: props.memberId,
          email: props.email,
          country: props.country,
          active: props.active,
          quantity: props.quantity ? (props.quantity.low ?? props.quantity) : undefined,
          availableCopies: props.availableCopies ? (props.availableCopies.low ?? props.availableCopies) : undefined,
        });
      }
      return id;
    };

    const abResult = await session.executeRead((tx) => tx.run(authorBookCypher));
    abResult.records.forEach((record) => {
      const a = record.get('a');
      const b = record.get('b');
      const sourceId = addNode(a.properties, 'Author');
      const targetId = addNode(b.properties, 'Book');
      links.push({
        source: sourceId,
        target: targetId,
        type: 'WROTE',
        color: '#6366f1',
      });
    });

    const mbResult = await session.executeRead((tx) => tx.run(memberBookCypher));
    mbResult.records.forEach((record) => {
      const m = record.get('m');
      const b = record.get('b');
      const r = record.get('r');
      const sourceId = addNode(m.properties, 'Member');
      const targetId = addNode(b.properties, 'Book');
      const rProps = r.properties;
      links.push({
        source: sourceId,
        target: targetId,
        type: 'BORROWED',
        status: rProps.status || 'ISSUED',
        issueDate: rProps.issueDate,
        dueDate: rProps.dueDate,
        returnDate: rProps.returnDate,
        fineAmount: rProps.fineAmount ? (rProps.fineAmount.low ?? rProps.fineAmount) : 0,
        borrowRecordId: rProps.borrowRecordId,
        color: rProps.status === 'ISSUED' ? '#ef4444' : '#10b981',
      });
    });

    const standaloneResult = await session.executeRead((tx) => tx.run(standaloneCypher));
    standaloneResult.records.forEach((record) => {
      const n = record.get('n');
      const label = n.labels[0] || 'Node';
      addNode(n.properties, label);
    });

    return {
      connected: true,
      nodes: Array.from(nodesMap.values()),
      links,
      stats: {
        totalNodes: nodesMap.size,
        totalRelationships: links.length,
      },
    };
  } catch (err) {
    console.error('[GraphService] getGraphData error:', err.message);
    return { connected: false, error: err.message, nodes: [], links: [] };
  } finally {
    await session.close();
  }
};

/**
 * Rebuild / Sync all nodes and relationships in Neo4j from MongoDB collections
 * Solves out-of-sync scenarios as requested in the guide.
 */
const rebuildGraphFromMongo = async (AuthorModel, BookModel, MemberModel, BorrowRecordModel) => {
  const status = await getNeo4jStatus();
  if (!status.connected) {
    throw new Error('Neo4j database is not connected. Please verify connection in .env.');
  }

  const session = getNeo4jSession();
  try {
    // 1. Fetch all documents from MongoDB
    const authors = await AuthorModel.find();
    const books = await BookModel.find().populate('authorId');
    const members = await MemberModel.find();
    const borrows = await BorrowRecordModel.find().populate('memberId').populate('bookId');

    // 2. Clear existing graph cleanly (optional safety: wipe existing nodes to prevent orphaned stale references)
    await session.executeWrite((tx) => tx.run('MATCH (n) DETACH DELETE n'));

    let authorsCreated = 0;
    let booksCreated = 0;
    let membersCreated = 0;
    let wroteCreated = 0;
    let borrowedCreated = 0;

    // 3. Batch Authors
    for (const a of authors) {
      await session.executeWrite((tx) =>
        tx.run(
          `MERGE (a:Author {mongoId: $authorId})
           SET a.name = $name, a.country = $country, a.biography = $biography`,
          {
            authorId: a._id.toString(),
            name: a.name,
            country: a.country || '',
            biography: a.biography || '',
          }
        )
      );
      authorsCreated++;
    }

    // 4. Batch Books & WROTE relationships
    for (const b of books) {
      const authorId = b.authorId?._id ? b.authorId._id.toString() : (b.authorId ? b.authorId.toString() : null);
      await session.executeWrite((tx) =>
        tx.run(
          `MERGE (b:Book {mongoId: $bookId})
           SET b.title = $title, b.isbn = $isbn, b.category = $category,
               b.quantity = toInteger($quantity), b.availableCopies = toInteger($availableCopies)
           WITH b
           MATCH (a:Author {mongoId: $authorId})
           MERGE (a)-[:WROTE]->(b)`,
          {
            bookId: b._id.toString(),
            title: b.title,
            isbn: b.isbn,
            category: b.category || 'General',
            quantity: b.quantity || 1,
            availableCopies: b.availableCopies || 0,
            authorId: authorId || '',
          }
        )
      );
      booksCreated++;
      if (authorId) wroteCreated++;
    }

    // 5. Batch Members
    for (const m of members) {
      await session.executeWrite((tx) =>
        tx.run(
          `MERGE (m:Member {mongoId: $memberId})
           SET m.memberId = $customMemberId, m.name = $name, m.email = $email, m.phone = $phone, m.active = $active`,
          {
            memberId: m._id.toString(),
            customMemberId: m.memberId,
            name: m.name,
            email: m.email,
            phone: m.phone || '',
            active: m.active ?? true,
          }
        )
      );
      membersCreated++;
    }

    // 6. Batch Borrowed relationships
    for (const br of borrows) {
      if (!br.memberId || !br.bookId) continue;
      const memberMongoId = br.memberId._id ? br.memberId._id.toString() : br.memberId.toString();
      const bookMongoId = br.bookId._id ? br.bookId._id.toString() : br.bookId.toString();

      await session.executeWrite((tx) =>
        tx.run(
          `MATCH (m:Member {mongoId: $memberId})
           MATCH (b:Book {mongoId: $bookId})
           MERGE (m)-[r:BORROWED {borrowRecordId: $recordId}]->(b)
           SET r.issueDate = $issueDate,
               r.dueDate = $dueDate,
               r.returnDate = $returnDate,
               r.status = $status,
               r.fineAmount = toInteger($fineAmount),
               r.overdueDays = toInteger($overdueDays)`,
          {
            memberId: memberMongoId,
            bookId: bookMongoId,
            recordId: br._id.toString(),
            issueDate: toIso(br.issueDate),
            dueDate: toIso(br.dueDate),
            returnDate: toIso(br.returnDate),
            status: br.status,
            fineAmount: br.fineAmount || 0,
            overdueDays: br.overdueDays || 0,
          }
        )
      );
      borrowedCreated++;
    }

    return {
      success: true,
      authorsCreated,
      booksCreated,
      membersCreated,
      wroteRelationships: wroteCreated,
      borrowedRelationships: borrowedCreated,
    };
  } finally {
    await session.close();
  }
};

/**
 * Execute custom Cypher query (falls back to MongoDB projection if Neo4j is in standby)
 */
const runCustomCypher = async (query, params = {}, models = null) => {
  const status = await getNeo4jStatus();
  if (!status.connected) {
    if (!models) {
      throw new Error('Neo4j database is not connected.');
    }
    const qLower = query.toLowerCase();
    const { Author, Book, Member, BorrowRecord } = models;
    let records = [];

    if (qLower.includes('wrote')) {
      const books = await Book.find().populate('authorId', 'name country').limit(25);
      records = books.map((b) => ({
        Author: b.authorId?.name || 'Unknown Author',
        Book: b.title,
        ISBN: b.isbn,
        Category: b.category,
      }));
    } else if (qLower.includes('borrowed')) {
      const borrows = await BorrowRecord.find()
        .populate('memberId', 'name memberId')
        .populate('bookId', 'title')
        .limit(25);
      records = borrows.map((r) => ({
        Member: r.memberId?.name || 'Unknown Member',
        Book: r.bookId?.title || 'Unknown Book',
        Status: r.status,
        DueDate: r.dueDate ? new Date(r.dueDate).toISOString().slice(0, 10) : '',
      }));
    } else {
      const [authors, books, members] = await Promise.all([
        Author.find().limit(10),
        Book.find().limit(10),
        Member.find().select('-password').limit(10),
      ]);
      records = [
        ...authors.map((a) => ({ NodeType: 'Author', Name: a.name, Info: a.country || '' })),
        ...books.map((b) => ({ NodeType: 'Book', Name: b.title, Info: b.isbn })),
        ...members.map((m) => ({ NodeType: 'Member', Name: m.name, Info: `${m.memberId} (${m.role})` })),
      ].slice(0, 25);
    }

    return {
      success: true,
      source: 'MONGODB_FALLBACK',
      records,
      count: records.length,
    };
  }

  const session = getNeo4jSession();
  try {
    const result = await session.executeRead((tx) => tx.run(query, params));
    const records = result.records.map((r) => r.toObject());
    return { success: true, source: 'NEO4J', records, count: records.length };
  } finally {
    await session.close();
  }
};

module.exports = {
  syncAuthor,
  deleteAuthorNode,
  syncBook,
  deleteBookNode,
  syncMember,
  deleteMemberNode,
  recordIssue,
  recordReturn,
  getGraphData,
  rebuildGraphFromMongo,
  runCustomCypher,
};

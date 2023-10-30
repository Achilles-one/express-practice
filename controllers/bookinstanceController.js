const BookInstance = require("../models/bookinstance");
var Book = require("../models/book");
var async = require("async");


const { body, validationResult } = require("express-validator");
const { sanitizeBody } = require('express-validator');

// 显示完整的书本实例列表
exports.bookinstance_list = function (req, res, next) {
  BookInstance.find()
    .populate("book")
    .exec(function (err, list_bookinstances) {
      if (err) {
        return next(err);
      }
      // Successful, so render
      res.render("bookinstance_list", {
        title: "Book Instance List",
        bookinstance_list: list_bookinstances,
      });
    });
};


// 为每位书本实例显示详细信息的页面
exports.bookinstance_detail = function (req, res, next) {
  BookInstance.findById(req.params.id)
    .populate("book")
    .exec(function (err, bookinstance) {
      if (err) {
        return next(err);
      }
      if (bookinstance == null) {
        // No results.
        var err = new Error("Book copy not found");
        err.status = 404;
        return next(err);
      }
      // Successful, so render.
      res.render("bookinstance_detail", {
        title: "Book:",
        bookinstance: bookinstance,
      });
    });
};







// 由 GET 显示创建书本实例的表单
exports.bookinstance_create_get = function (req, res, next) {
  Book.find({}, "title").exec(function (err, books) {
    if (err) {
      return next(err);
    }
    // Successful, so render.
    res.render("bookinstance_form", {
      title: "Create BookInstance",
      book_list: books,
    });
  });
};






// 由 POST 处理书本实例创建操作
exports.bookinstance_create_post = [
  // Validate fields.
  body("book", "Book must be specified").isLength({ min: 1 }).trim(),
  body("imprint", "Imprint must be specified").isLength({ min: 1 }).trim(),
  body("due_back", "Invalid date").optional({ checkFalsy: true }).isISO8601(),

  // Sanitize fields.
  sanitizeBody("book").trim().escape(),
  sanitizeBody("imprint").trim().escape(),
  sanitizeBody("status").trim().escape(),
  sanitizeBody("due_back").toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a BookInstance object with escaped and trimmed data.
    var bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values and error messages.
      Book.find({}, "title").exec(function (err, books) {
        if (err) {
          return next(err);
        }
        // Successful, so render.
        res.render("bookinstance_form", {
          title: "Create BookInstance",
          book_list: books,
          selected_book: bookinstance.book._id,
          errors: errors.array(),
          bookinstance: bookinstance,
        });
      });
      return;
    } else {
      // Data from form is valid.
      bookinstance.save(function (err) {
        if (err) {
          return next(err);
        }
        // Successful - redirect to new record.
        res.redirect(bookinstance.url);
      });
    }
  },
];






// 由 GET 显示删除书本实例的表单
exports.bookinstance_delete_get = function (req, res, next) {
  async.parallel(
    {
      bookinstance: function (callback) {
        BookInstance.findById(req.params.id).exec(callback);
      },
    },
    function (err, results) {
      if (err) {
        return next(err);
      }
      if (results.bookinstance == null) {
        // No results.
        res.redirect("/catalog/bookinstances");
      }
      // Successful, so render.
      res.render("bookinstance_delete", {
        title: "Delete BookInstance",
        bookinstance: results.bookinstance,
      });
    },
  );
};



// 由 POST 处理书本实例删除操作
exports.bookinstance_delete_post = function (req, res, next) {
  async.parallel(
    {
      bookinstance: function (callback) {
        BookInstance.findById(req.body.bookinstanceid).exec(callback);
      },
    },
    function (err, results) {
      if (err) {
        return next(err);
      }
      // Success
      // BookInstance has no books. Delete object and redirect to the list of bookinstances.
      BookInstance.findByIdAndRemove(
        req.body.bookinstanceid,
        function deleteBookInstance(err) {
          if (err) {
            return next(err);
          }
          // Success - go to bookinstance list
          res.redirect("/catalog/bookinstances");
        }
      );
    },
  );
};







// 由 GET 显示更新书本实例的表单
exports.bookinstance_update_get = function (req, res, next) {
  // Get bookinstance, books and genres for form.
  async.parallel(
    {
      bookinstance: function (callback) {
        BookInstance.findById(req.params.id)
          .populate("book")
          .exec(callback);
      },
      books: function (callback) {
        Book.find(callback);
      },
    },
    function (err, results) {
      if (err) {
        return next(err);
      }
      if (results.bookinstance == null) {
        // No results.
        var err = new Error("BookInstance not found");
        err.status = 404;
        return next(err);
      }
      // Success.
      res.render("bookinstance_form", {
        title: "Update BookInstance",
        book_list: results.books,
        bookinstance: results.bookinstance,
      });
    },
  );
};







// 由 POST 处理书本实例更新操作
exports.bookinstance_update_post = [
  // Validate fields.
  body("book", "Book must be specified").isLength({ min: 1 }).trim(),
  body("imprint", "Imprint must be specified").isLength({ min: 1 }).trim(),
  body("due_back", "Invalid date").optional({ checkFalsy: true }).isISO8601(),

  // Sanitize fields.
  sanitizeBody("book").trim().escape(),
  sanitizeBody("imprint").trim().escape(),
  sanitizeBody("status").trim().escape(),
  sanitizeBody("due_back").toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a BookInstance object with escaped/trimmed data and old id.
    var bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
      _id: req.params.id, //This is required, or a new ID will be assigned!
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.

      // Get all books and genres for form.
      async.parallel(
        {
          books: function (callback) {
            Book.find(callback);
          },
        },
        function (err, results) {
          if (err) {
            return next(err);
          }

          res.render("bookinstance_form", {
            title: "Update BookInstance",
            book_list: results.books,
            selected_book: bookinstance.book._id,
            bookinstance: bookinstance,
            errors: errors.array(),
          });
        },
      );
      return;
    } else {
      // Data from form is valid. Update the record.
      BookInstance.findByIdAndUpdate(req.params.id, bookinstance, {}, function (err, thebookinstance) {
        if (err) {
          return next(err);
        }
        // Successful - redirect to bookinstance detail page.
        res.redirect(thebookinstance.url);
      });
    }
  },
];

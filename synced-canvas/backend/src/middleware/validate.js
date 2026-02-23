import { ApiError } from "../utils/ApiError.js";

export const validate = (schema, property = "body") => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req[property], {
        abortEarly: true,
        stripUnknown: true,
      });

      if (error) {
        return next(new ApiError(400, error.details[0].message));
      }

      // attach validated data
      req.validatedData = value;

      next();
    } catch (err) {
      next(err);
    }
  };
};
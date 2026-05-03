import { Router } from "express";
import { validate } from "../../middleware/validate";
import { echoSchema } from "./echo.schema";

const echoRouter = Router();

echoRouter.post("/echo", validate(echoSchema), (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      message: req.body.message,
    },
  });
});

export { echoRouter };

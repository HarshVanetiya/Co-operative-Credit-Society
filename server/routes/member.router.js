import express from "express";
import {
    createMember,
    getAllMember,
    getMember,
    updateMember,
} from "../controller/member.controller.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import {
    createMemberSchema,
    updateMemberSchema,
    idParamSchema,
} from "../lib/validators.js";

const router = express.Router();

router.post("/create", validateBody(createMemberSchema), createMember);
router.get("/get/:id", validateParams(idParamSchema), getMember);
router.get("/list", getAllMember);
router.put("/update/:id", validateParams(idParamSchema), validateBody(updateMemberSchema), updateMember);
// router.delete("/delete/:id", validateParams(idParamSchema), deleteMember);

export default router;

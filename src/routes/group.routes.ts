import { Router } from 'express'
import { container } from 'tsyringe'
import { GroupController } from '../controllers/groupController'
import { ValidationMiddleware } from '../middleware/validate'
const validate = container.resolve(ValidationMiddleware).validate
import { CreateGroupSchema, UpdateGroupSchema, GroupMemberActionSchema, AddMemberSchema } from '../dto/request/group.request.dto'
import { AuthMiddleware } from '../middleware/auth'
const auth = container.resolve(AuthMiddleware).auth

export class GroupRoutes {
    public router: Router;
    private _controller: GroupController;

    constructor() {
        this.router = Router();
        this._controller = container.resolve(GroupController);
        this.setupRoutes();
    }

    private setupRoutes() {
        this.router.post('/', auth, validate(CreateGroupSchema), this._controller.createGroup)
        this.router.get('/', this._controller.listGroups)
        this.router.get('/:id', this._controller.groupDetail)
        this.router.post('/:id/join', auth, validate(GroupMemberActionSchema), this._controller.joinGroup)
        this.router.post('/:id/leave', auth, validate(GroupMemberActionSchema), this._controller.leaveGroup)
        this.router.post('/:id/approve', auth, validate(GroupMemberActionSchema), this._controller.approveGroupJoin)
        this.router.post('/:id/reject', auth, validate(GroupMemberActionSchema), this._controller.rejectGroupJoin)
        this.router.post('/:id/kick', auth, validate(GroupMemberActionSchema), this._controller.kickGroupMember)
        this.router.post('/:id/block', auth, validate(GroupMemberActionSchema), this._controller.blockGroupMember)
        this.router.patch('/:id', auth, validate(UpdateGroupSchema), this._controller.updateGroup)
        this.router.post('/:id/members', auth, validate(AddMemberSchema), this._controller.addGroupMember)
        this.router.delete('/:id', auth, this._controller.deleteGroup)
    }
}

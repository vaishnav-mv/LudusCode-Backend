import { Router } from 'express'
import { container } from 'tsyringe'
import { GroupController } from '../controllers/groupController'
import { ValidationMiddleware } from '../middleware/validate'
const validate = ValidationMiddleware.getInstance().validate
import { CreateGroupSchema, UpdateGroupSchema, GroupMemberActionSchema, AddMemberSchema } from '../dto/request/group.request.dto'
import { AuthMiddleware } from '../middleware/auth'
const auth = AuthMiddleware.getInstance().auth

export class GroupRoutes {
    public router: Router;
    private _controller: GroupController;

    constructor() {
        this.router = Router();
        this._controller = container.resolve(GroupController);
        this.setupRoutes();
    }

    private setupRoutes() {
        this.router.post('/', auth, validate(CreateGroupSchema), (req, res, next) => this._controller.createGroup(req, res).catch(next))
        this.router.get('/', (req, res, next) => this._controller.listGroups(req, res).catch(next))
        this.router.get('/:id', (req, res, next) => this._controller.groupDetail(req, res).catch(next))
        this.router.post('/:id/join', auth, validate(GroupMemberActionSchema), (req, res, next) => this._controller.joinGroup(req, res).catch(next))
        this.router.post('/:id/leave', auth, validate(GroupMemberActionSchema), (req, res, next) => this._controller.leaveGroup(req, res).catch(next))
        this.router.post('/:id/approve', auth, validate(GroupMemberActionSchema), (req, res, next) => this._controller.approveGroupJoin(req, res).catch(next))
        this.router.post('/:id/reject', auth, validate(GroupMemberActionSchema), (req, res, next) => this._controller.rejectGroupJoin(req, res).catch(next))
        this.router.post('/:id/kick', auth, validate(GroupMemberActionSchema), (req, res, next) => this._controller.kickGroupMember(req, res).catch(next))
        this.router.post('/:id/block', auth, validate(GroupMemberActionSchema), (req, res, next) => this._controller.blockGroupMember(req, res).catch(next))
        this.router.patch('/:id', auth, validate(UpdateGroupSchema), (req, res, next) => this._controller.updateGroup(req, res).catch(next))
        this.router.post('/:id/members', auth, validate(AddMemberSchema), (req, res, next) => this._controller.addGroupMember(req, res).catch(next))
        this.router.delete('/:id', auth, (req, res, next) => this._controller.deleteGroup(req, res).catch(next))
    }
}

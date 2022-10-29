import { Request, Response, Router } from 'express';
import { prisma } from '../../common/database';
import { authenticate } from '../../middleware/authenticate';
import { isModMiddleware } from './isModMiddleware';

export function getUsers(Router: Router) {
  Router.get('/moderation/users', 
    authenticate(),
    isModMiddleware,
    route
  );
}





async function route (req: Request, res: Response) {
  const after = req.query.after as string | undefined;

  const users = await prisma.user.findMany({
    orderBy: {
      joinedAt: 'desc'
    },
    take: 30,
    ...(after ? {cursor: { id: after }} : undefined),
    include: {account: {select: { email: true }}}
  });


  res.json(users);


}
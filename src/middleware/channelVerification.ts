import { NextFunction, Request, Response } from 'express';
import { getChannelCache } from '../cache/ChannelCache';
import { getServerMemberCache } from '../cache/ServerMemberCache';
import { generateError } from '../common/errorHandler';
import { CHANNEL_PERMISSIONS, USER_BADGES, hasBit } from '../common/Bitwise';
import { channelPermissions } from './channelPermissions';
import { ChannelType } from '../types/Channel';

interface Options {
  allowBot?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Options {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function channelVerification(opts?: Options) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { channelId } = req.params;

    if (!channelId) {
      return res.status(403).json(generateError('Channel ID is required.'));
    }

    const [channel, error] = await getChannelCache(channelId, req.userCache.id);

    if (error !== null) {
      return res.status(403).json(generateError(error));
    }

    const isServerChannel =
      channel.type === ChannelType.CATEGORY ||
      channel.type === ChannelType.SERVER_TEXT;

    if (isServerChannel) {
      const [memberCache, error] = await getServerMemberCache(
        channel.server.id,
        req.userCache.id
      );
      if (error !== null) {
        return res.status(403).json(generateError(error));
      }
      req.serverMemberCache = memberCache;
      req.serverCache = channel.server;
    }

    const isDMChannel =
      channel.type === ChannelType.DM_TEXT && channel?.inbox?.recipientId;

    if (isDMChannel) {
      const isRecipient = channel.inbox.recipientId === req.userCache.id;
      const isCreator = channel.inbox.createdById === req.userCache.id;
      if (!isRecipient && !isCreator) {
        return res
          .status(403)
          .json(generateError('You are not a member of this channel.'));
      }
    }

    const isTicketChannel = channel.type === ChannelType.TICKET;
    if (isTicketChannel) {
      const isTicketCreator = channel.createdById === req.userCache.id;
      const isAdmin =
        hasBit(req.userCache.badges, USER_BADGES.ADMIN.bit) ||
        hasBit(req.userCache.badges, USER_BADGES.FOUNDER.bit);
      const canAccess = isTicketCreator || isAdmin;
      if (!canAccess) {
        return res
          .status(403)
          .json(generateError('You are not a member of this channel.'));
      }
    }

    req.channelCache = channel;
    channelPermissions({
      bit: CHANNEL_PERMISSIONS.PRIVATE_CHANNEL.bit,
      invert: true,
      message: 'This channel is private.',
    })(req, res, next);
  };
}

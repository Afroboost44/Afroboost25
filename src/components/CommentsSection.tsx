'use client';

import { useState, useEffect } from 'react';
import { PublicationComment, User } from '@/types';
import { publicationCommentService } from '@/lib/database';
import { formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

interface CommentsSectionProps {
  publicationId: string;
  currentUser: User | null;
}

export default function CommentsSection({ publicationId, currentUser }: CommentsSectionProps) {
  const { t } = useTranslation();
  const [comments, setComments] = useState<PublicationComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [publicationId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const commentsData = await publicationCommentService.getByPublication(publicationId);
      setComments(commentsData);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newComment.trim() || submitting) return;

    try {
      setSubmitting(true);
      await publicationCommentService.create({
        publicationId,
        authorId: currentUser.id,
        authorName: `${currentUser.firstName} ${currentUser.lastName}`,
        authorProfileImage: currentUser.profileImage,
        authorRole: currentUser.role,
        comment: newComment.trim(),
        parentCommentId: replyTo || undefined,
        likes: 0
      });

      setNewComment('');
      setReplyTo(null);
      await loadComments();
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: any) => {
    try {
      const dateObj = date instanceof Timestamp ? date.toDate() : new Date(date);
      return formatDistanceToNow(dateObj, { addSuffix: true });
    } catch (error) {
      return 'Recently';
    }
  };

  const groupedComments = comments.reduce((acc, comment) => {
    if (!comment.parentCommentId) {
      acc.push({
        ...comment,
        replies: comments.filter(reply => reply.parentCommentId === comment.id)
      });
    }
    return acc;
  }, [] as (PublicationComment & { replies: PublicationComment[] })[]);

  if (loading) {
    return (
      <div className="p-4 border-t border-gray-100">
        <div className="animate-pulse space-y-4">
          <div className="flex space-x-3">
            <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-700">
      {/* Comments List */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {groupedComments.length === 0 ? (
          <p className="text-gray-400 text-center py-4">
            {t('noCommentsYet', 'No comments yet. Be the first to comment!')}
          </p>
        ) : (
          <div className="space-y-4">
            {groupedComments.map((comment) => (
              <div key={comment.id} className="space-y-3">
                {/* Main Comment */}
                <div className="flex space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full overflow-hidden ${comment.authorRole === 'coach' ? 'ring-1 ring-yellow-400' : ''}`}>
                      <Image
                        src={comment.authorProfileImage || '/default-avatar.png'}
                        alt={comment.authorName}
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-gray-800 rounded-lg px-3 py-2">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-sm text-gray-100">{comment.authorName}</span>
                        {comment.authorRole === 'coach' && (
                          <span className="px-1.5 py-0.5 text-xs bg-yellow-900 text-yellow-200 rounded-full font-medium">
                            {t('coach', 'Coach')}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-200">{comment.comment}</p>
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                      <button
                        onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                        className="hover:text-purple-400 transition-colors"
                      >
                        {t('reply', 'Reply')}
                      </button>
                      {comment.likes > 0 && (
                        <span>{comment.likes} {t('likes', 'likes')}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {comment.replies.length > 0 && (
                  <div className="ml-11 space-y-3">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex space-x-3">
                        <div className="flex-shrink-0">
                          <div className={`w-7 h-7 rounded-full overflow-hidden ${reply.authorRole === 'coach' ? 'ring-1 ring-yellow-400' : ''}`}>
                            <Image
                              src={reply.authorProfileImage || '/default-avatar.png'}
                              alt={reply.authorName}
                              width={28}
                              height={28}
                              className="object-cover"
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="bg-gray-800 rounded-lg px-3 py-2">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium text-sm text-gray-100">{reply.authorName}</span>
                              {reply.authorRole === 'coach' && (
                                <span className="px-1.5 py-0.5 text-xs bg-yellow-900 text-yellow-200 rounded-full font-medium">
                                  {t('coach', 'Coach')}
                                </span>
                              )}
                              <span className="text-xs text-gray-400">{formatDate(reply.createdAt)}</span>
                            </div>
                            <p className="text-sm text-gray-200">{reply.comment}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                {replyTo === comment.id && currentUser && (
                  <div className="ml-11">
                    <form onSubmit={handleSubmitComment} className="flex flex-col xs:flex-row xs:space-x-3 gap-2 xs:gap-0">
                      <div className="flex-shrink-0">
                        <div className="w-7 h-7 rounded-full overflow-hidden">
                          <Image
                            src={currentUser.profileImage || '/default-avatar.png'}
                            alt={currentUser.firstName}
                            width={28}
                            height={28}
                            className="object-cover"
                          />
                        </div>
                      </div>
                      <div className="flex-1 w-full">
                        <div className="flex flex-col sm:flex-row w-full">
                          <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={t('writeReply', 'Write a reply...')}
                            className="flex-1 text-sm border border-gray-300 rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            disabled={submitting}
                          />
                          <button
                            type="submit"
                            disabled={!newComment.trim() || submitting}
                            className="px-4 py-2 bg-purple-600 text-white text-sm rounded-b-lg sm:rounded-r-lg sm:rounded-bl-none hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2 sm:mt-0"
                          >
                            {submitting ? t('posting', 'Posting...') : t('post', 'Post')}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comment Form */}
      {currentUser && !replyTo && (
        <div className="p-4 border-t border-gray-100">
          <form onSubmit={handleSubmitComment} className="flex flex-col xs:flex-row xs:space-x-3 gap-2 xs:gap-0">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full overflow-hidden">
                <Image
                  src={currentUser.profileImage || '/default-avatar.png'}
                  alt={currentUser.firstName}
                  width={32}
                  height={32}
                  className="object-cover"
                />
              </div>
            </div>
            <div className="flex-1 w-full">
              <div className="flex flex-col sm:flex-row w-full">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={t('writeComment', 'Write a comment...')}
                  className="flex-1 input-primary rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none"
                  disabled={submitting}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="btn-primary rounded-b-lg sm:rounded-r-lg sm:rounded-bl-none mt-2 sm:mt-0"
                >
                  {submitting ? t('posting', 'Posting...') : t('post', 'Post')}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {!currentUser && (
        <div className="p-4 border-t border-gray-700 text-center">
          <p className="text-gray-400 text-sm">
            {t('loginToComment', 'Please log in to comment')}
          </p>
        </div>
      )}
    </div>
  );
}

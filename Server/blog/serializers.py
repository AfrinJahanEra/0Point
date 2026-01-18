# blog/serializers.py
from rest_framework import serializers
from .models import Blog, BlogCommentVote, BlogVote, BlogComment
from account.models import Account

class BlogSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    title = serializers.CharField(max_length=500, required=True)
    content = serializers.CharField(required=True)
    tags = serializers.ListField(child=serializers.CharField(max_length=50), required=False, default=[])
    co_authors = serializers.ListField(child=serializers.CharField(), required=False, default=[])
    is_draft = serializers.BooleanField(read_only=True)
    is_published = serializers.BooleanField(read_only=True)
    published_at = serializers.DateTimeField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    upvotes = serializers.IntegerField(read_only=True)
    downvotes = serializers.IntegerField(read_only=True)
    score = serializers.IntegerField(read_only=True)

    def create(self, validated_data):
        # Get the current user from context
        user = self.context.get('user')
        if not user:
            raise serializers.ValidationError("User authentication required")

        # Normalize and clean up content
        content = validated_data['content']
        content = content.replace('\r\n', '\n').replace('\r', '\n')  # Normalize line endings
        # Remove excessive empty lines (more than 2 consecutive)
        import re
        content = re.sub(r'\n{3,}', '\n\n', content)
        validated_data['content'] = content.strip()

        # Handle co-authors
        co_author_usernames = validated_data.pop('co_authors', [])
        co_authors = []
        for username in co_author_usernames:
            try:
                co_author = Account.objects.get(name=username)
                co_authors.append(co_author)
            except Account.DoesNotExist:
                pass  # Skip invalid usernames

        # Create the blog
        blog = Blog(
            title=validated_data['title'],
            content=validated_data['content'],
            tags=validated_data.get('tags', []),
            author=user,
            co_authors=co_authors,
            is_draft=True,  # Start as draft
            is_published=False
        )
        blog.save()
        return blog

    def update(self, instance, validated_data):
        # Normalize content if it's being updated
        if 'content' in validated_data:
            content = validated_data['content']
            content = content.replace('\r\n', '\n').replace('\r', '\n')  # Normalize line endings
            # Remove excessive empty lines (more than 2 consecutive)
            import re
            content = re.sub(r'\n{3,}', '\n\n', content)
            validated_data['content'] = content.strip()

        # Handle co-authors update
        co_author_usernames = validated_data.pop('co_authors', None)
        if co_author_usernames is not None:
            co_authors = []
            for username in co_author_usernames:
                try:
                    co_author = Account.objects.get(name=username)
                    co_authors.append(co_author)
                except Account.DoesNotExist:
                    pass
            instance.co_authors = co_authors

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance

class BlogVoteSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    blog_id = serializers.CharField(required=True)
    vote_type = serializers.ChoiceField(choices=['upvote', 'downvote'], required=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def create(self, validated_data):
        user = self.context.get('user')
        if not user:
            raise serializers.ValidationError("User authentication required")

        blog_id = validated_data['blog_id']
        vote_type = validated_data['vote_type']

        try:
            blog = Blog.objects.get(id=blog_id)
        except Blog.DoesNotExist:
            raise serializers.ValidationError("Blog not found")

        # Check if user already voted on this blog
        existing_vote = BlogVote.objects(blog=blog, user=user).first()
        
        if existing_vote:
            if existing_vote.vote_type == vote_type:
                # User is trying to vote the same way again - remove the vote
                existing_vote.delete()
                return {'message': 'Vote removed', 'vote_type': None}
            else:
                # User is changing their vote
                existing_vote.vote_type = vote_type
                existing_vote.save()
                return existing_vote
        else:
            # Create new vote
            vote = BlogVote(
                blog=blog,
                user=user,
                vote_type=vote_type
            )
            vote.save()
            return vote

class BlogCommentSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    blog_id = serializers.CharField(required=True)
    content = serializers.CharField(max_length=1000, required=True)
    parent_comment_id = serializers.CharField(required=False, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def create(self, validated_data):
        user = self.context.get('user')
        if not user:
            raise serializers.ValidationError("User authentication required")

        blog_id = validated_data['blog_id']
        content = validated_data['content']
        parent_comment_id = validated_data.get('parent_comment_id')

        try:
            blog = Blog.objects.get(id=blog_id)
        except Blog.DoesNotExist:
            raise serializers.ValidationError("Blog not found")

        parent_comment = None
        if parent_comment_id:
            try:
                parent_comment = BlogComment.objects.get(id=parent_comment_id, blog=blog)
            except BlogComment.DoesNotExist:
                raise serializers.ValidationError("Parent comment not found")

        # Create the comment
        comment = BlogComment(
            blog=blog,
            author=user,
            content=content,
            parent_comment=parent_comment
        )
        comment.save()

        # If this is a reply, add it to the parent's replies list
        if parent_comment:
            parent_comment.replies.append(comment)
            parent_comment.save()

        return comment
    
class BlogCommentVoteSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    comment_id = serializers.CharField(required=True)
    vote_type = serializers.ChoiceField(choices=['upvote', 'downvote'], required=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def create(self, validated_data):
        user = self.context.get('user')
        if not user:
            raise serializers.ValidationError("User authentication required")

        comment_id = validated_data['comment_id']
        vote_type = validated_data['vote_type']

        try:
            comment = BlogComment.objects.get(id=comment_id)
        except BlogComment.DoesNotExist:
            raise serializers.ValidationError("Comment not found")

        # Check if user already voted on this comment
        existing_vote = BlogCommentVote.objects(comment=comment, user=user).first()
        
        if existing_vote:
            if existing_vote.vote_type == vote_type:
                # User is trying to vote the same way again - remove the vote
                existing_vote.delete()
                return {'message': 'Vote removed', 'vote_type': None}
            else:
                # User is changing their vote
                existing_vote.vote_type = vote_type
                existing_vote.save()
                return existing_vote
        else:
            # Create new vote
            vote = BlogCommentVote(
                comment=comment,
                user=user,
                vote_type=vote_type
            )
            vote.save()
            return vote
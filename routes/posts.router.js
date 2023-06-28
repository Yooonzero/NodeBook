const express = require('express');
const { Op } = require('sequelize');
const { Posts, Categories } = require('../models');
const { verifyAccessToken } = require('../middleware/auth.middleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');
const router = express.Router();

// 게시글 작성
router.post('/posts', verifyAccessToken, uploadMiddleware.single('file'), async (req, res) => {
  try {
    const userId = res.locals.user;
    const filepath = req.file ? req.file.location : null;
    const { categoryList, title, content } = req.body;

    if (!title || !content) {
      res.status(412).json({
        message: '제목 또는 내용을 입력해주세요',
      });
      return;
    }

    const post = await Posts.create({
      UserId: userId.userId,
      Nickname: userId.nickname,
      categoryList,
      title,
      content,
      img: filepath,
    });

    await Categories.create({
      PostId: post.postId,
      categoryList,
    });

    res.status(201).json({
      message: '게시글 생성완료',
    });
  } catch {
    return res.status(412).json({
      message: '데이터 형식이 올바르지 않아 생성에 실패했습니다.',
    });
  }
});

// 최신 게시글 조회 API
// res는 추후 수정필요 (하나의 파일로 관리하여 오류메세지 통일)
router.get('/posts', async (req, res) => {
  try {
    const postList = await Posts.findAll({
      attributes: ['postId', 'nickname', 'categoryList', 'title', 'content', 'img'],
      order: [['createdAt', 'DESC']],
    });

    if (!postList.length) {
      return res.status(404).json({
        message: '조회할 게시글이 없습니다.',
      });
    }

    res.status(200).json({
      postList: postList,
    });
  } catch {
    return res.status(400).json({
      message: '게시글 조회에 실패하였습니다.',
    });
  }
});

// 관심사 게시글 조회
router.get('/posts/category/interest', verifyAccessToken, async (req, res) => {
  try {
    const userId = res.locals.user;

    if (!userId.interest) {
      return res.status(404).json({
        message: '설정된 관심사가 없습니다. 마이페이지에서 관심사를 등록해주세요.',
      });
    }
    const categoryPosts = await Posts.findAll({
      attributes: ['postId', 'Nickname', 'categoryList', 'title', 'content', 'img'],
      where: { categoryList: userId.interest },
    });

    return res.status(200).json({
      categoryPosts,
    });
  } catch {
    return res.status(400).json({
      message: '게시글 조회에 실패하였습니다.',
    });
  }
});

// 게시글 상세 조회
router.get('/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const postDetail = await Posts.findOne({
      attributes: [
        'postId',
        'userId',
        'categoryList',
        'nickname',
        'title',
        'content',
        'img',
        'createdAt',
        'updatedAt',
      ],
      where: { postId },
    });

    if (!postDetail) {
      return res.status(404).json({
        message: '해당 게시글을 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      Detail: postDetail,
    });
  } catch {
    return res.status(400).json({
      message: '게시글 조회에 실패하였습니다.',
    });
  }
});

// 게시글 수정
router.put('/posts/:postId', verifyAccessToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = res.locals.user;
    const { categoryList, title, content } = req.body;

    const modifyPost = await Posts.findOne({ where: { postId } });
    if (!modifyPost) {
      return res.status(404).json({ message: '해당 게시글을 찾을 수 없습니다.' });
    } else if (!categoryList || !title || !content) {
      return res.status(400).json({ message: '카테고리, 제목, 내용을 입력해주세요.' });
    } else {
      await Posts.update(
        { categoryList, title, content },
        { where: { [Op.and]: [{ postId }, { UserId: userId }] } }
      );
      return res.status(201).json({
        message: '게시글 수정 완료',
      });
    }
  } catch {
    return res.status(400).json({
      message: '게시글 수정에 실패하였습니다.',
    });
  }
});

// 게시글 삭제
// 수정과 마찬가지로 작성자에게만 보이는 버튼이라면 아래 주석 삭제
router.delete('/posts/:postId', verifyAccessToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = res.locals.user;
    const deletePost = await Posts.findOne({ where: { postId } });

    if (!deletePost) {
      return res.status(404).json({ message: '해당 게시글을 찾을 수 없습니다.' });
    } else {
      await Posts.destroy({
        where: {
          [Op.and]: [{ postId }, { UserId: userId }],
        },
      });
      res.status(204).json();
    }
  } catch {
    return res.status(400).json({
      message: '게시글 삭제에 실패하였습니다.',
    });
  }
});

module.exports = router;

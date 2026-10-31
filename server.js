import express from 'express'
const express = require('express')
const app = express()

app.get('/usuarios', (req, res) => {
    res.send ('Ok, deu bom')
})

app.listen(3000, () => {
    console.log('LETA: http://localhost:3000/usuarios')
})
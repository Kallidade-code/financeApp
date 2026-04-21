using Microsoft.AspNetCore.Mvc;
using financeApp.Models;
using financeApp.Repositories;

namespace financeApp.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class CategoriaController : ControllerBase
    {
        private readonly ICategoriaRepository _repository;

        public CategoriaController(ICategoriaRepository repository)
        {
            _repository = repository;
        }

        // GET /categoria — lista todas as categorias
        [HttpGet]
        public ActionResult<List<Categoria>> Listar()
        {
            return Ok(_repository.Listar());
        }

        // GET /categoria/{id} — busca categoria por ID
        [HttpGet("{id}")]
        public ActionResult<Categoria> BuscarPorId(int id)
        {
            var categoria = _repository.BuscarPorId(id);
            if (categoria == null)
                return NotFound($"Categoria com id {id} não encontrada.");

            return Ok(categoria);
        }

        // POST /categoria — cria nova categoria
        [HttpPost]
        public ActionResult AdicionarCategoria(Categoria categoria)
        {
            try
            {
                _repository.Adicionar(categoria);
                return CreatedAtAction(nameof(BuscarPorId), new { id = categoria.Id }, categoria);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // PUT /categoria/{id} — atualiza categoria existente
        [HttpPut("{id}")]
        public ActionResult Atualizar(int id, Categoria categoria)
        {
            if (id != categoria.Id)
                return BadRequest("O id da URL não corresponde ao id da categoria.");

            var existente = _repository.BuscarPorId(id);
            if (existente == null)
                return NotFound($"Categoria com id {id} não encontrada.");

            try
            {
                _repository.Atualizar(categoria);
                return NoContent();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // DELETE /categoria/{id} — remove categoria
        [HttpDelete("{id}")]
        public ActionResult Deletar(int id)
        {
            try
            {
                _repository.Deletar(id);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }
    }
}

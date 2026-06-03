using Microsoft.AspNetCore.Mvc;
using financeApp.Models;
using financeApp.Repositories;

namespace financeApp.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class FinanceController : ControllerBase
    {
        private readonly ITransacaoRepository _repository;

        public FinanceController(ITransacaoRepository repository)
        {
            _repository = repository;
        }

        // GET /finance — lista todas as transações
        [HttpGet]
        public ActionResult<List<Transacao>> Listar()
        {
            return Ok(_repository.Listar());
        }

        // GET /finance/{id} — busca uma transação por ID
        [HttpGet("{id}")]
        public ActionResult<Transacao> BuscarPorId(int id)
        {
            var transacao = _repository.BuscarPorId(id);
            if (transacao == null)
                return NotFound($"Transação com id {id} não encontrada.");

            return Ok(transacao);
        }

        // POST /finance — cria nova transação
        [HttpPost]
        public ActionResult AdicionarTransacao(Transacao transacao)
        {
            try
            {
                _repository.Adicionar(transacao);
                return CreatedAtAction(nameof(BuscarPorId), new { id = transacao.Id }, transacao);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // PUT /finance/{id} — atualiza uma transação existente
        [HttpPut("{id}")]
        public ActionResult Atualizar(int id, Transacao transacao)
        {
            if (id != transacao.Id)
                return BadRequest("O id da URL não corresponde ao id da transação.");

            var existente = _repository.BuscarPorId(id);
            if (existente == null)
                return NotFound($"Transação com id {id} não encontrada.");

            try
            {
                _repository.Atualizar(transacao);
                return NoContent();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // DELETE /finance/{id} — remove uma transação
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

        // GET /finance/saldo — retorna o saldo atual
        [HttpGet("saldo")]
        public ActionResult<decimal> ObterSaldo()
        {
            return Ok(_repository.ObterSaldo());
        }

        // GET /finance/tipo?tipo=Receita — filtra por tipo
        [HttpGet("tipo")]
        public ActionResult<List<Transacao>> FiltrarPorTipo(TipoTransacao tipo)
        {
            return Ok(_repository.FiltrarPorTipo(tipo));
        }

        // GET /finance/categoria — total de despesas por categoria
        [HttpGet("categoria")]
        public ActionResult<Dictionary<string, decimal>> TotalPorCategoria()
        {
            return Ok(_repository.TotalPorCategoria());
        }
    }
}
